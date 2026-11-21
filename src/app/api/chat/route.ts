import OpenAI from 'openai'
import { openai as aiSdkOpenAi } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { createBookingTools } from '@/ai/tools'
import { aiServices } from '@/data/aiServices'
import { otherServices } from '@/data/otherServices'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { getVisibleProducts } from '@/lib/catalog'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { rateLimit } from '@/lib/rate-limit'
import {
  buildMrRobotSystemInstructions,
  isOpenAiConfigured,
  resolveOpenAiModel,
  validateMrRobotChatPayload,
  type VerifiedCatalogSummaryItem,
  type VerifiedCustomerOrderSummary,
} from '@/modules/ai/mrrobot-assistant'
import { listOrdersForCustomer } from '@/modules/commerce/customer-order-access'
import { resolveProductDisplayPrice } from '@/modules/commerce/display-price'
import { formatStoreMoney } from '@/modules/commerce/money'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'
import { paymentStatusLabelFa } from '@/modules/payment/labels'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function extractClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  const realIp = req.headers.get('x-real-ip')?.trim()
  return realIp ? realIp.slice(0, 64) : 'unknown'
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
      return {
        name: p.nameFa || p.nameEn || p.slug,
        slug: p.slug,
        categoryName: p.category?.nameFa || p.category?.nameEn || undefined,
        priceSummary,
        purchasable: display.purchasable,
        shortDescription: p.description?.slice(0, 140),
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
        fulfillmentStatusFa: FULFILLMENT_STATUS_LABELS[o.fulfillmentStatus] || o.fulfillmentStatus,
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
  if (!isOpenAiConfigured()) {
    return Response.json(
      {
        enabled: false,
        code: 'AI_NOT_CONFIGURED',
        error:
          'دستیار هوشمند MR.ROBOT AI در حال حاضر روی سرور پیکربندی نشده است. برای فعال‌سازی، کلید OPENAI_API_KEY باید در تنظیمات سرور ثبت شود.',
      },
      { status: 503 },
    )
  }

  const clientIp = extractClientIp(req)
  if (!rateLimit(`chat:${clientIp}`, 20, 60_000)) {
    return Response.json(
      {
        code: 'RATE_LIMITED',
        error: 'تعداد درخواست‌های گفت‌وگو بیش از حد مجاز است. لطفاً یک دقیقه صبر کرده و دوباره تلاش کنید.',
      },
      { status: 429 },
    )
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
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

      const result = await streamText({
        model: aiSdkOpenAi(resolveOpenAiModel()),
        messages,
        system: `تو یک منشی هوشمند، حرفه‌ای و خوش‌برخورد برای سالن زیبایی هستی.
وظیفه داری با مشتریان گفتگو کنی، اطلاعات خدمات و قیمت‌ها را از طریق ابزارها به آن‌ها بگویی و در نهایت برایشان نوبت ثبت کنی.
همیشه پاسخ‌هایت را به زبان فارسی روان و صمیمی بنویس. پیش از ثبت نوبت نهایی، حتماً شماره تماس، نام و سرویس مدنظر مشتری را تایید کن.`,
        tools,
        maxSteps: 5,
      })

      return result.toDataStreamResponse()
    } catch {
      return Response.json(
        { error: 'خطا در برقراری ارتباط با سرویس گفت‌وگو. لطفاً دوباره تلاش کنید.' },
        { status: 502 },
      )
    }
  }

  // Official MR.ROBOT AI Assistant via OpenAI official SDK + Responses API
  const validated = validateMrRobotChatPayload(rawBody)
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  try {
    const { instructions, isAuthenticated } = await buildVerifiedMrRobotContext()
    const model = resolveOpenAiModel()
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const response = await client.responses.create(
      {
        model,
        instructions,
        input: validated.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_output_tokens: 650,
        temperature: 0.55,
      },
      {
        signal: AbortSignal.timeout(25_000),
      },
    )

    const reply = response.output_text?.trim()
    if (!reply) {
      return Response.json(
        { error: 'پاسخی از سرویس هوشمند دریافت نشد. لطفاً دوباره تلاش کنید.' },
        { status: 502 },
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
    const isTimeout =
      err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
        ? err.status
        : 502

    if (isTimeout) {
      return Response.json(
        {
          code: 'TIMEOUT',
          error: 'زمان پاسخ‌گویی دستیار هوشمند به پایان رسید. لطفاً دوباره تلاش کنید.',
        },
        { status: 504 },
      )
    }

    if (status === 401 || status === 403) {
      return Response.json(
        {
          code: 'AUTH_ERROR',
          error: 'کلید اتصال OpenAI در سرور معتبر نیست. لطفاً با مدیر سایت تماس بگیرید.',
        },
        { status: 503 },
      )
    }

    if (status === 429) {
      return Response.json(
        {
          code: 'UPSTREAM_RATE_LIMIT',
          error: 'سرویس هوش مصنوعی موقتاً شلوغ است. لطفاً چند لحظه دیگر دوباره تلاش کنید.',
        },
        { status: 429 },
      )
    }

    return Response.json(
      {
        code: 'UPSTREAM_ERROR',
        error: 'امکان دریافت پاسخ از دستیار هوشمند وجود نداشت. لطفاً دوباره تلاش کنید.',
      },
      { status: 502 },
    )
  }
}