import { z } from 'zod'

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
export const MAX_CHAT_HISTORY_MESSAGES = 16
export const MAX_CHAT_MESSAGE_LENGTH = 1200

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
    .max(MAX_CHAT_HISTORY_MESSAGES, `حداکثر ${MAX_CHAT_HISTORY_MESSAGES} پیام در هر درخواست مجاز است.`),
})

export function isOpenAiConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim())
}

export function resolveOpenAiModel(env: Record<string, string | undefined> = process.env): string {
  const raw = env.OPENAI_MODEL?.trim()
  if (!raw) return DEFAULT_OPENAI_MODEL
  // Allow standard OpenAI model id characters only
  if (!/^[a-zA-Z0-9._:-]{2,64}$/.test(raw)) return DEFAULT_OPENAI_MODEL
  return raw
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

  return { ok: true, messages }
}

export type VerifiedCatalogSummaryItem = {
  name: string
  slug: string
  categoryName?: string
  priceSummary: string
  purchasable: boolean
  shortDescription?: string
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
          .map(
            (item) =>
              `- ${item.name} (/subscriptions/${item.slug})${item.categoryName ? ` [دسته: ${item.categoryName}]` : ''} — قیمت: ${item.priceSummary} (${item.purchasable ? 'قابل خرید آنلاین' : 'سفارش از طریق پشتیبانی/تماس'})${item.shortDescription ? ` — ${item.shortDescription}` : ''}`,
          )
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

شخصیت و لحن:
- هوشمند، حرفه‌ای، صمیمی، مطمئن، مختصر و کمی آینده‌نگر.
- به‌صورت پیش‌فرض به زبان فارسی روان و طبیعی پاسخ بده؛ اگر کاربر به انگلیسی نوشت، به انگلیسی حرفه‌ای پاسخ بده.
- پاسخ‌ها کوتاه، کاربردی و ساختاریافته باشند (از زیاده‌گویی و شعارهای توخالی پرهیز کن).

قوانین قطعی صداقت و عدم تخیل:
- هرگز محصول، پلن، قیمت، موجودی، کد تخفیف، وضعیت سفارش، تایید پرداخت یا سیاست شرکتی را از خودت نساز.
- فقط از اطلاعات تاییدشده زیر استفاده کن. اگر محصولی در وضعیت «سفارش از طریق پشتیبانی/تماس» است، دقیقاً همین را بگو و کاربر را به /contact راهنمایی کن.
- هرگز نگو پرداخت انجام شده یا درگاه فعال است مگر اینکه در اطلاعات سفارش تاییدشده صراحتاً ذکر شده باشد.

مسیرهای رسمی وب‌سایت MR.ROBOT:
- فروشگاه کامل محصولات و اشتراک‌ها: /shop
- سبد خرید: /cart
- تسویه‌حساب و ثبت سفارش: /checkout
- ورود به حساب کاربری: /account/login
- سفارش‌های حساب کاربری: /account/orders
- پیگیری سفارش مهمان با لینک اختصاصی: /orders/track
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
