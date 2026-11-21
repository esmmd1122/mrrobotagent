import OpenAI from 'openai'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { createBookingTools } from '@/ai/tools'
import { aiServices } from '@/data/aiServices'
import { otherServices } from '@/data/otherServices'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { getVisibleProducts } from '@/lib/catalog'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { parseStringListJson } from '@/lib/product-list-fields'
import { rateLimit } from '@/lib/rate-limit'
import {
  OPENAI_MAX_COMPLETION_TOKENS,
  buildMrRobotSystemInstructions,
  classifyOpenAiError,
  extractChatCompletionText,
  getSafeOpenAiEnvDiagnostics,
  isOpenAiConfigured,
  modelSupportsTemperature,
  resolveOpenAiModel,
  sanitizeOpenAiApiKey,
  validateMrRobotChatPayload,
  type VerifiedCatalogPlanSummary,
  type VerifiedCatalogSummaryItem,
  type VerifiedCustomerOrderSummary,
} from '@/modules/ai/mrrobot-assistant'
import { listOrdersForCustomer } from '@/modules/commerce/customer-order-access'
import { resolveProductDisplayPrice } from '@/modules/commerce/display-price'
import { formatStoreMoney } from '@/modules/commerce/money'
import { effectiveUnitPrice } from '@/modules/commerce/unit-price'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'
import { paymentStatusLabelFa } from '@/modules/payment/labels'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MAX_REQUEST_BYTES = 24_000

function extractClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  const realIp = req.headers.get('x-real-ip')?.trim()
  return realIp ? realIp.slice(0, 64) : 'unknown'
}

function calcValidDiscountPercent(
  price: number | null | undefined,
  promoPrice: number | null | undefined,
): number | null {
  if (
    typeof price !== 'number' ||
    typeof promoPrice !== 'number' ||
    price <= 0 ||
    promoPrice <= 0 ||
    promoPrice >= price
  ) {
    return null
  }
  const pct = Math.round(((price - promoPrice) / price) * 100)
  return pct > 0 && pct < 100 ? pct : null
}

export async function GET() {
  const configured = isOpenAiConfigured()
  let authenticated = false
  try {
    const session = await getCustomerSession()
    authenticated = Boolean(session?.sub)
  } catch {
    authenticated = false
  }

  return Response.json(
    {
      configured,
      model: configured ? resolveOpenAiModel() : null,
      authenticated,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

async function buildVerifiedMrRobotContext() {
  let catalog: VerifiedCatalogSummaryItem[] = []
  try {
    const products = await getVisibleProducts()
    catalog = products.slice(0, 40).map((p) => {
      const display = resolveProductDisplayPrice({
        price: p.price,
        promoPrice: p.promoPrice,
        isAvailable: p.isAvailable,
        isVisible: p.isVisible,
        plansEnabled: p.plansEnabled,
        plans: p.plans.map((pl) => ({
          id: pl.id,
          price: pl.price,
          promoPrice: pl.promoPrice,
          isActive: pl.isActive,
          isFeatured: pl.isFeatured,
        })),
      })

      const priceSummary =
        display.purchasable && display.unitPrice != null
          ? display.isFromPrice
            ? `از ${formatStoreMoney(display.unitPrice, p.currency)}`
            : formatStoreMoney(display.unitPrice, p.currency)
          : 'تماس بگیرید'

      const singleDiscount = !p.plansEnabled
        ? calcValidDiscountPercent(p.price, p.promoPrice)
        : null
      const originalPriceSummary =
        singleDiscount !== null && p.price != null
          ? formatStoreMoney(p.price, p.currency)
          : null

      const plans: VerifiedCatalogPlanSummary[] = p.plansEnabled
        ? p.plans
            .filter((pl) => pl.isActive && pl.price > 0)
            .slice(0, 6)
            .map((pl) => {
              const unit = effectiveUnitPrice(pl.price, pl.promoPrice) ?? pl.price
              const disc = calcValidDiscountPercent(pl.price, pl.promoPrice)
              const unitFa =
                pl.durationUnit === 'DAY'
                  ? 'روز'
                  : pl.durationUnit === 'YEAR'
                    ? 'سال'
                    : 'ماه'
              const durationLabel =
                pl.durationValue && pl.durationValue > 0
                  ? `${pl.durationValue} ${unitFa}`
                  : null
              return {
                title: pl.title,
                durationLabel,
                priceFormatted: formatStoreMoney(unit, p.currency),
                originalPriceFormatted:
                  disc !== null ? formatStoreMoney(pl.price, p.currency) : null,
                discountPercent: disc,
              }
            })
        : []

      const features = parseStringListJson(p.featuresJson).slice(0, 4)
      const details = parseStringListJson(p.detailsJson).slice(0, 3)

      return {
        name: p.nameFa || p.nameEn || p.slug,
        nameEn: p.nameEn || undefined,
        slug: p.slug,
        categoryName: p.category?.nameFa || p.category?.nameEn || undefined,
        priceSummary,
        originalPriceSummary,
        discountPercent: singleDiscount,
        purchasable: display.purchasable,
        shortDescription: p.description?.slice(0, 160),
        features: features.length > 0 ? features : undefined,
        details: details.length > 0 ? details : undefined,
        plans: plans.length > 0 ? plans : undefined,
      }
    })
  } catch {
    catalog = []
  }

  let isAuthenticated = false
  let customerOrders: VerifiedCustomerOrderSummary[] = []
  try {
    const session = await getCustomerSession()
    if (session?.sub) {
      isAuthenticated = true
      const orders = await listOrdersForCustomer(session.sub, 5)
      customerOrders = orders.map((o) => ({
        orderNumber: o.orderNumber,
        statusFa: ORDER_STATUS_LABELS[o.status] || o.status,
        paymentStatusFa: paymentStatusLabelFa(o.paymentStatus),
        fulfillmentStatusFa:
          FULFILLMENT_STATUS_LABELS[o.fulfillmentStatus] || o.fulfillmentStatus,
        totalFormatted: formatStoreMoney(o.totalAmount, o.currency),
        createdDateFa: new Intl.DateTimeFormat('fa-IR').format(new Date(o.createdAt)),
      }))
    }
  } catch {
    isAuthenticated = false
    customerOrders = []
  }

  return {
    isAuthenticated,
    instructions: buildMrRobotSystemInstructions({
      catalog,
      aiServicesList: aiServices.map((s) => `${s.title}: ${s.description}`),
      otherServicesList: otherServices.map((s) => `${s.title}: ${s.description}`),
      isAuthenticated,
      customerOrders,
    }),
  }
}

export async function POST(req: Request) {
  const apiKey = sanitizeOpenAiApiKey()
  if (!apiKey) {
    return Response.json(
      {
        enabled: false,
        code: 'AI_NOT_CONFIGURED',
        error:
          'دستیار هوشمند در حال حاضر فعال نیست. می‌توانید از فروشگاه محصولات را مشاهده کنید یا با پشتیبانی در تماس باشید.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const clientIp = extractClientIp(req)
  if (!rateLimit(`chat:${clientIp}`, 20, 60_000)) {
    return Response.json(
      {
        code: 'RATE_LIMITED',
        error:
          'تعداد پیام‌های ارسالی در این لحظه بیش از حد مجاز است. لطفاً یک دقیقه صبر کرده و دوباره تلاش کنید.',
      },
      { status: 429, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const contentLength = Number(req.headers.get('content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return Response.json(
      {
        code: 'PAYLOAD_TOO_LARGE',
        error: 'حجم درخواست ارسالی بیش از حد مجاز است. لطفاً پیام کوتاه‌تری ارسال کنید.',
      },
      { status: 413 },
    )
  }

  let rawBody: unknown
  try {
    const rawText = await req.text()
    if (rawText.length > MAX_REQUEST_BYTES) {
      return Response.json(
        {
          code: 'PAYLOAD_TOO_LARGE',
          error: 'حجم درخواست ارسالی بیش از حد مجاز است. لطفاً پیام کوتاه‌تری ارسال کنید.',
        },
        { status: 413 },
      )
    }
    rawBody = JSON.parse(rawText)
  } catch {
    return Response.json({ error: 'بدنه درخواست JSON معتبر نیست.' }, { status: 400 })
  }

  // Preserve existing /chat salon booking demo compatibility when businessSlug is explicitly sent
  if (
    rawBody &&
    typeof rawBody === 'object' &&
    'businessSlug' in rawBody &&
    typeof (rawBody as { businessSlug?: unknown }).businessSlug === 'string' &&
    (rawBody as { businessSlug: string }).businessSlug.trim().length > 0
  ) {
    try {
      const { messages, businessSlug } = rawBody as {
        messages: Parameters<typeof streamText>[0]['messages']
        businessSlug: string
      }
      const slug = businessSlug.trim()
      const tools = createBookingTools(slug)
      const aiSdkProvider = createOpenAI({ apiKey })

      const result = await streamText({
        model: aiSdkProvider(resolveOpenAiModel()),
        messages,
        system: `تو یک منشی هوشمند، حرفه‌ای و خوش‌برخورد برای سالن زیبایی هستی.
وظیفه داری با مشتریان گفتگو کنی، اطلاعات خدمات و قیمت‌ها را از طریق ابزارها به آن‌ها بگویی و در نهایت برایشان نوبت ثبت کنی.
همیشه پاسخ‌هایت را به زبان فارسی روان و صمیمی بنویس. پیش از ثبت نوبت نهایی، حتماً شماره تماس، نام و سرویس مدنظر مشتری را تایید کن.`,
        tools,
        maxSteps: 5,
      })

      return result.toDataStreamResponse()
    } catch (err) {
      const classified = classifyOpenAiError(err)
      console.error('[api/chat] salon streamText failed', {
        category: classified.category,
        upstreamStatus: classified.upstreamStatus,
        providerCode: classified.providerCode,
        diagnostics: getSafeOpenAiEnvDiagnostics(),
      })
      return Response.json(
        { code: classified.category, error: classified.userMessageFa },
        { status: classified.httpStatus },
      )
    }
  }

  // Official MR.ROBOT AI Assistant via OpenAI official SDK + Chat Completions API
  const validated = validateMrRobotChatPayload(rawBody)
  if (!validated.ok) {
    return Response.json({ code: 'VALIDATION_ERROR', error: validated.error }, { status: 400 })
  }

  const model = resolveOpenAiModel()
  try {
    const { instructions, isAuthenticated } = await buildVerifiedMrRobotContext()
    const client = new OpenAI({
      apiKey,
      timeout: 22_000,
      maxRetries: 1,
    })

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: instructions },
        ...validated.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      max_completion_tokens: OPENAI_MAX_COMPLETION_TOKENS,
      ...(modelSupportsTemperature(model) ? { temperature: 0.55 } : {}),
    })

    const reply = extractChatCompletionText(completion)
    if (!reply) {
      console.error('[api/chat] OpenAI returned empty completion text', {
        model,
        finishReason: completion.choices?.[0]?.finish_reason ?? null,
      })
      return Response.json(
        {
          code: 'EMPTY_REPLY',
          error: 'پاسخی از سرویس هوشمند دریافت نشد. لطفاً دوباره تلاش کنید.',
        },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return Response.json(
      {
        reply,
        model,
        authenticated: isAuthenticated,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (err: unknown) {
    const classified = classifyOpenAiError(err)
    console.error('[api/chat] OpenAI request failed', {
      category: classified.category,
      upstreamStatus: classified.upstreamStatus,
      providerCode: classified.providerCode,
      providerType: classified.providerType,
      diagnostics: getSafeOpenAiEnvDiagnostics(),
    })

    return Response.json(
      {
        code: classified.category,
        error: classified.userMessageFa,
      },
      {
        status: classified.httpStatus,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}