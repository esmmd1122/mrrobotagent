import { z } from 'zod'

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
export const MAX_CHAT_HISTORY_MESSAGES = 16
export const MAX_CHAT_MESSAGE_LENGTH = 1200
export const MAX_CHAT_TOTAL_CHARS = 10_000
export const OPENAI_MAX_COMPLETION_TOKENS = 650

export type ChatRole = 'user' | 'assistant'

export type ChatTurn = {
  role: ChatRole
  content: string
}

const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, 'پیام نمی‌تواند خالی باشد.')
    .refine(
      (v) => v.length <= MAX_CHAT_MESSAGE_LENGTH,
      `حداکثر طول هر پیام ${MAX_CHAT_MESSAGE_LENGTH} کاراکتر است.`,
    ),
})

const mrRobotChatPayloadSchema = z.object({
  messages: z
    .array(chatTurnSchema)
    .min(1, 'حداقل یک پیام لازم است.')
    .max(
      MAX_CHAT_HISTORY_MESSAGES,
      `حداکثر ${MAX_CHAT_HISTORY_MESSAGES} پیام در هر درخواست مجاز است.`,
    ),
})

/**
 * Normalizes a server-side secret value by trimming whitespace/newlines
 * and stripping accidental surrounding quotes from hosting dashboards.
 * Never returns or logs the secret externally.
 */
export function sanitizeOpenAiApiKey(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env.OPENAI_API_KEY
  if (typeof raw !== 'string') return null
  let cleaned = raw.trim()
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  // Remove accidental internal CR/LF from copy-paste
  cleaned = cleaned.replace(/[\r\n]+/g, '').trim()
  return cleaned.length > 0 ? cleaned : null
}

/**
 * Safe non-secret diagnostics for server logs (never includes key value or prefix).
 */
export function getSafeOpenAiEnvDiagnostics(
  env: Record<string, string | undefined> = process.env,
): {
  hasKey: boolean
  keyHadPaddingOrQuotes: boolean
  configuredModel: string
} {
  const raw = env.OPENAI_API_KEY
  const sanitized = sanitizeOpenAiApiKey(env)
  return {
    hasKey: Boolean(sanitized),
    keyHadPaddingOrQuotes: Boolean(raw && sanitized && raw !== sanitized),
    configuredModel: resolveOpenAiModel(env),
  }
}

export function isOpenAiConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(sanitizeOpenAiApiKey(env))
}

export function resolveOpenAiModel(
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = env.OPENAI_MODEL?.trim().replace(/^["']|["']$/g, '').trim()
  if (!raw) return DEFAULT_OPENAI_MODEL
  // Allow standard OpenAI model id characters only
  if (!/^[a-zA-Z0-9._:-]{2,64}$/.test(raw)) return DEFAULT_OPENAI_MODEL
  return raw
}

/**
 * Reasoning models (o1, o3, o4, gpt-5 series) reject custom `temperature` values.
 */
export function modelSupportsTemperature(model: string): boolean {
  const normalized = model.trim().toLowerCase()
  return !/^(o1|o3|o4|gpt-5)([-.:_]|$)/.test(normalized)
}

export type ValidationResult =
  | { ok: true; messages: ChatTurn[] }
  | { ok: false; error: string }

export function validateMrRobotChatPayload(body: unknown): ValidationResult {
  const parsed = mrRobotChatPayloadSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || 'ساختار پیام ارسالی نامعتبر است.'
    return { ok: false, error: firstIssue }
  }

  const messages = parsed.data.messages
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user') {
    return { ok: false, error: 'آخرین پیام باید از طرف کاربر باشد.' }
  }

  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0)
  if (totalChars > MAX_CHAT_TOTAL_CHARS) {
    return {
      ok: false,
      error: 'حجم تاریخچه گفت‌وگو بیش از حد مجاز است. لطفاً گفت‌وگو را پاک کرده و دوباره پیام بفرستید.',
    }
  }

  return { ok: true, messages }
}

/**
 * Extracts assistant text safely from an OpenAI Chat Completions response.
 */
export function extractChatCompletionText(completion: unknown): string | null {
  if (!completion || typeof completion !== 'object') return null
  const choices = (completion as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const first = choices[0] as {
    message?: { content?: string | Array<{ type?: string; text?: string }> | null }
  }
  const content = first?.message?.content
  if (typeof content === 'string') {
    const trimmed = content.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim()
    return joined.length > 0 ? joined : null
  }
  return null
}

export type OpenAiErrorCategory =
  | 'TIMEOUT'
  | 'AUTH_ERROR'
  | 'INSUFFICIENT_QUOTA'
  | 'MODEL_ACCESS_ERROR'
  | 'UPSTREAM_RATE_LIMIT'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'UPSTREAM_ERROR'

export type ClassifiedOpenAiError = {
  category: OpenAiErrorCategory
  httpStatus: number
  userMessageFa: string
  upstreamStatus: number | null
  providerCode: string | null
  providerType: string | null
}

/**
 * Classifies OpenAI SDK & network failures into distinct, actionable categories
 * without exposing raw provider error dumps or secrets to end users.
 */
export function classifyOpenAiError(err: unknown): ClassifiedOpenAiError {
  const errObj =
    typeof err === 'object' && err !== null
      ? (err as {
          name?: unknown
          message?: unknown
          status?: unknown
          code?: unknown
          type?: unknown
          error?: { code?: unknown; type?: unknown; message?: unknown }
          cause?: { code?: unknown; name?: unknown }
        })
      : {}

  const name = typeof errObj.name === 'string' ? errObj.name : ''
  const message = typeof errObj.message === 'string' ? errObj.message : ''
  const status = typeof errObj.status === 'number' ? errObj.status : null
  const providerCode =
    typeof errObj.code === 'string'
      ? errObj.code
      : typeof errObj.error?.code === 'string'
        ? errObj.error.code
        : null
  const providerType =
    typeof errObj.type === 'string'
      ? errObj.type
      : typeof errObj.error?.type === 'string'
        ? errObj.error.type
        : null
  const lowerMsg = `${message} ${providerCode ?? ''} ${providerType ?? ''}`.toLowerCase()

  // 1. Timeout / Abort
  if (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    name === 'APIConnectionTimeoutError' ||
    name === 'APIUserAbortError' ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('timeout')
  ) {
    return {
      category: 'TIMEOUT',
      httpStatus: 504,
      userMessageFa:
        'زمان پاسخ‌گویی دستیار هوشمند به پایان رسید. لطفاً چند لحظه بعد دوباره تلاش کنید.',
      upstreamStatus: status,
      providerCode,
      providerType,
    }
  }

  // 2. Invalid / Unauthorized API key (401)
  if (
    status === 401 ||
    name === 'AuthenticationError' ||
    providerCode === 'invalid_api_key' ||
    lowerMsg.includes('incorrect api key') ||
    lowerMsg.includes('invalid_api_key')
  ) {
    return {
      category: 'AUTH_ERROR',
      httpStatus: 503,
      userMessageFa:
        'اتصال دستیار هوشمند در حال حاضر با مشکل احراز هویت سرور روبه‌رو شده است. لطفاً کمی بعد دوباره تلاش کنید یا با پشتیبانی در تماس باشید.',
      upstreamStatus: status ?? 401,
      providerCode,
      providerType,
    }
  }

  // 3. Billing / Insufficient API credit (429 insufficient_quota or billing_hard_limit_reached)
  if (
    providerCode === 'insufficient_quota' ||
    providerType === 'insufficient_quota' ||
    providerCode === 'billing_hard_limit_reached' ||
    lowerMsg.includes('insufficient_quota') ||
    lowerMsg.includes('exceeded your current quota') ||
    lowerMsg.includes('billing')
  ) {
    return {
      category: 'INSUFFICIENT_QUOTA',
      httpStatus: 503,
      userMessageFa:
        'سرویس هوش مصنوعی به‌دلیل اتمام موقت اعتبار سرور در دسترس نیست. می‌توانید مستقیم از فروشگاه سفارش دهید یا با پشتیبانی تماس بگیرید.',
      upstreamStatus: status ?? 429,
      providerCode,
      providerType,
    }
  }

  // 4. Rate limit (429 without quota/billing issue)
  if (status === 429 || name === 'RateLimitError' || providerCode === 'rate_limit_exceeded') {
    return {
      category: 'UPSTREAM_RATE_LIMIT',
      httpStatus: 429,
      userMessageFa:
        'سرویس هوش مصنوعی موقتاً شلوغ است. لطفاً چند ثانیه صبر کرده و دوباره تلاش کنید.',
      upstreamStatus: 429,
      providerCode,
      providerType,
    }
  }

  // 5. Model access / not found / permission denied (403, 404)
  if (
    status === 403 ||
    status === 404 ||
    name === 'PermissionDeniedError' ||
    name === 'NotFoundError' ||
    providerCode === 'model_not_found' ||
    lowerMsg.includes('does not exist or you do not have access')
  ) {
    return {
      category: 'MODEL_ACCESS_ERROR',
      httpStatus: 503,
      userMessageFa:
        'مدل انتخاب‌شده دستیار هوشمند در دسترس سرور نیست. لطفاً کمی بعد دوباره تلاش کنید یا از بخش پشتیبانی کمک بگیرید.',
      upstreamStatus: status,
      providerCode,
      providerType,
    }
  }

  // 6. Invalid request format (400)
  if (status === 400 || name === 'BadRequestError' || providerType === 'invalid_request_error') {
    return {
      category: 'INVALID_REQUEST',
      httpStatus: 502,
      userMessageFa:
        'در پردازش درخواست گفت‌وگو خطایی رخ داد. لطفاً پیام خود را کوتاه‌تر ارسال کنید یا دوباره تلاش نمایید.',
      upstreamStatus: 400,
      providerCode,
      providerType,
    }
  }

  // 7. Network / connection error
  const causeCode = typeof errObj.cause?.code === 'string' ? errObj.cause.code : ''
  if (
    name === 'APIConnectionError' ||
    /^(ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN)$/i.test(causeCode) ||
    lowerMsg.includes('connection error') ||
    lowerMsg.includes('fetch failed')
  ) {
    return {
      category: 'NETWORK_ERROR',
      httpStatus: 502,
      userMessageFa:
        'ارتباط سرور با سرویس هوش مصنوعی موقتاً برقرار نشد. لطفاً لحظاتی بعد دوباره تلاش کنید.',
      upstreamStatus: status,
      providerCode: providerCode ?? (causeCode || null),
      providerType,
    }
  }

  // 8. Fallback upstream failure
  return {
    category: 'UPSTREAM_ERROR',
    httpStatus: 502,
    userMessageFa:
      'امکان دریافت پاسخ از دستیار هوشمند وجود نداشت. لطفاً دوباره تلاش کنید.',
    upstreamStatus: status,
    providerCode,
    providerType,
  }
}

export type VerifiedCatalogPlanSummary = {
  title: string
  durationLabel?: string | null
  priceFormatted: string
  originalPriceFormatted?: string | null
  discountPercent?: number | null
}

export type VerifiedCatalogSummaryItem = {
  name: string
  nameEn?: string
  slug: string
  categoryName?: string
  priceSummary: string
  originalPriceSummary?: string | null
  discountPercent?: number | null
  purchasable: boolean
  shortDescription?: string
  features?: string[]
  details?: string[]
  plans?: VerifiedCatalogPlanSummary[]
}

export type VerifiedCustomerOrderSummary = {
  orderNumber: string
  statusFa: string
  paymentStatusFa: string
  fulfillmentStatusFa: string
  totalFormatted: string
  createdDateFa: string
}

export type SystemContextInput = {
  catalog: VerifiedCatalogSummaryItem[]
  aiServicesList: string[]
  otherServicesList: string[]
  isAuthenticated: boolean
  customerOrders: VerifiedCustomerOrderSummary[]
}

export function buildMrRobotSystemInstructions(ctx: SystemContextInput): string {
  const catalogBlock =
    ctx.catalog.length > 0
      ? ctx.catalog
          .map((item) => {
            const parts: string[] = [
              `- ${item.name}${item.nameEn && item.nameEn !== item.name ? ` (${item.nameEn})` : ''} [/subscriptions/${item.slug}]`,
            ]
            if (item.categoryName) parts.push(`دسته: ${item.categoryName}`)
            const discountText =
              item.discountPercent && item.originalPriceSummary
                ? ` (با ${item.discountPercent}٪ تخفیف از ${item.originalPriceSummary})`
                : ''
            parts.push(
              `قیمت: ${item.priceSummary}${discountText} — ${
                item.purchasable ? 'قابل خرید آنلاین' : 'سفارش از طریق پشتیبانی/تماس'
              }`,
            )
            if (item.plans && item.plans.length > 0) {
              const planStr = item.plans
                .slice(0, 5)
                .map((pl) => {
                  const dur = pl.durationLabel ? ` (${pl.durationLabel})` : ''
                  const disc =
                    pl.discountPercent && pl.originalPriceFormatted
                      ? ` [تخفیف ${pl.discountPercent}٪ از ${pl.originalPriceFormatted}]`
                      : ''
                  return `${pl.title}${dur}: ${pl.priceFormatted}${disc}`
                })
                .join(' | ')
              parts.push(`پلن‌ها: ${planStr}`)
            }
            if (item.shortDescription) {
              parts.push(`توضیح: ${item.shortDescription}`)
            }
            if (item.features && item.features.length > 0) {
              parts.push(`ویژگی‌ها: ${item.features.slice(0, 4).join('، ')}`)
            }
            if (item.details && item.details.length > 0) {
              parts.push(`جزئیات/نحوه ارائه: ${item.details.slice(0, 3).join('، ')}`)
            }
            return parts.join(' | ')
          })
          .join('\n')
      : '- در حال حاضر فهرست محصولات از دیتابیس دریافت نشد؛ کاربر را به صفحه /shop یا /contact راهنمایی کن.'

  const aiList = ctx.aiServicesList.map((s) => `- ${s}`).join('\n')
  const otherList = ctx.otherServicesList.map((s) => `- ${s}`).join('\n')

  const ordersBlock = ctx.isAuthenticated
    ? ctx.customerOrders.length > 0
      ? [
          'وضعیت احراز هویت کاربر: وارد حساب کاربری شده است (احراز هویت سمت سرور تایید شده).',
          'سفارش‌های تاییدشده متعلق به همین کاربر:',
          ...ctx.customerOrders.map(
            (o) =>
              `- شماره سفارش ${o.orderNumber} | وضعیت سفارش: ${o.statusFa} | وضعیت پرداخت: ${o.paymentStatusFa} | تحویل: ${o.fulfillmentStatusFa} | مبلغ: ${o.totalFormatted} | تاریخ: ${o.createdDateFa}`,
          ),
          'اگر کاربر درباره سفارش خود پرسید، فقط بر اساس همین فهرست واقعی پاسخ بده و برای جزئیات بیشتر یا فایل‌های تحویل او را به صفحه /account/orders راهنمایی کن.',
        ].join('\n')
      : 'وضعیت احراز هویت کاربر: وارد حساب کاربری شده است، اما در حال حاضر هیچ سفارشی در حساب او ثبت نشده است. اگر درباره وضعیت سفارش پرسید، صادقانه بگو سفارشی در حساب فعلی ثبت نشده و می‌تواند از /shop خرید کند یا در صورت خرید مهمان از لینک اختصاصی /orders/track استفاده کند.'
    : [
        'وضعیت احراز هویت کاربر: ناشناس (وارد حساب کاربری نشده است).',
        'قانون امنیتی قطعی: هرگز وضعیت هیچ سفارشی را حدس نزن، نساز و اطلاعات هیچ مشتری را فاش نکن — حتی اگر کاربر شماره سفارش یا ایمیل در چت نوشت.',
        'اگر کاربر درباره وضعیت سفارش خود پرسید، مودبانه توضیح بده که برای حفظ امنیت، ابتدا باید وارد حساب کاربری خود در صفحه /account/login شود (سپس سفارش‌ها در /account/orders قابل مشاهده است) یا از لینک اختصاصی پیگیری سفارش (/orders/track) که هنگام ثبت سفارش دریافت کرده استفاده کند، و در صورت نیاز با پشتیبانی (/contact) تماس بگیرد.',
      ].join('\n')

  return `تو «MR.ROBOT AI»، دستیار هوشمند رسمی برند و فروشگاه دیجیتال MR.ROBOT هستی.

شخصیت و زبان:
- هوشمند، حرفه‌ای، صمیمی، شفاف، دقیق و کوتاه‌گو.
- به‌صورت پیش‌فرض به زبان فارسی روان و طبیعی پاسخ بده.
- اگر کاربر به زبان انگلیسی پیام داد، به انگلیسی حرفه‌ای، طبیعی و شفاف پاسخ بده.
- از زیاده‌گویی و شعارهای تبلیغاتی توخالی پرهیز کن؛ پاسخ‌ها کاربردی و ساختاریافته باشند.

قوانین قطعی صداقت و امنیت:
- هرگز محصول، پلن، قیمت، تخفیف، موجودی، زمان تحویل تضمینی، روش فعال‌سازی ناموجود، وضعیت سفارش یا تایید پرداخت را از خودت نساز.
- فقط از اطلاعات تاییدشده زیر استفاده کن. اگر محصولی در وضعیت «سفارش از طریق پشتیبانی/تماس» است، دقیقاً همین را بگو و کاربر را به صفحه /contact راهنمایی کن.
- هرگز اطلاعات خصوصی مشتریان دیگر یا داده‌های مدیریتی/داخلی سیستم را بیان نکن و هیچ عملیات مدیریتی انجام نده.

فرآیند رسمی خرید، تحویل و فعال‌سازی در MR.ROBOT:
1. انتخاب محصول یا پلن از فروشگاه (/shop) یا صفحه اختصاصی هر محصول (/subscriptions/[slug]).
2. کلیک روی «خرید فوری» (/subscriptions/[slug]/buy) یا «افزودن به سبد خرید» و مراجعه به /cart و سپس /checkout.
3. ثبت اطلاعات تماس و فیلدهای لازم محصول (در صورت وجود) و تکمیل فرآیند پرداخت و ثبت سفارش.
4. پس از ثبت سفارش، کد پیگیری صادر می‌شود؛ وضعیت سفارش، راهنمای فعال‌سازی و فایل‌ها/اطلاعات تحویلی پس از تایید و تکمیل تحویل در صفحه /account/orders (برای کاربران واردشده) یا از طریق لینک پیگیری /orders/track در دسترس قرار می‌گیرد. (اگر زمان تحویل دقیق در مشخصات محصول ذکر نشده، زمان دقیق تضمین‌شده اختراع نکن و بگو پس از ثبت و تایید سفارش از طریق پنل سفارش و پشتیبانی پیگیری و تحویل می‌شود.)
5. برای مشاوره پیش از خرید، استعلام قیمت یا پشتیبانی فنی پس از خرید، صفحه /contact در دسترس است.

مسیرهای رسمی وب‌سایت MR.ROBOT:
- فروشگاه کامل محصولات و اشتراک‌ها: /shop
- سبد خرید: /cart
- تسویه‌حساب و ثبت سفارش: /checkout
- ورود به حساب کاربری: /account/login
- سفارش‌های حساب کاربری: /account/orders
- پیگیری سفارش مهمان: /orders/track
- تماس با پشتیبانی و ثبت درخواست اختصاصی: /contact
- درباره MR.ROBOT: /about

محصولات تاییدشده فعلی در دیتابیس فروشگاه:
${catalogBlock}

حوزه‌های خدمات هوش مصنوعی MR.ROBOT:
${aiList}

سایر خدمات تخصصی MR.ROBOT:
${otherList}

اطلاعات سفارش کاربر:
${ordersBlock}`
}
