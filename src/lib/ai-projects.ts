import { z } from 'zod'

export const AI_PROJECT_CATEGORIES = [
  {
    id: 'personal-ai-assistant',
    titleFa: 'دستیار هوش مصنوعی شخصی',
    titleEn: 'Personal AI Assistant',
    shortDesc:
      'مدیریت هوشمند برنامه روزانه، خلاصه‌سازی پیام‌ها، یادآوری کارها و دستیار اختصاصی متناسب با سبک کار و زندگی شما.',
    accent: 'cyan',
    defaultFeatures: [
      'خلاصه‌سازی پیام‌ها و ایمیل‌ها',
      'یادآوری هوشمند جلسات و کارها',
      'پاسخ‌گویی سریع فارسی ۲۴/۷',
    ],
    defaultIntegrations: ['تلگرام', 'تقویم و نوبت‌دهی'],
  },
  {
    id: 'business-ai-assistant',
    titleFa: 'دستیار هوشمند کسب‌وکار',
    titleEn: 'Business AI Assistant',
    shortDesc:
      'پاسخ‌گویی دقیق به مشتریان بر اساس دانش اختصاصی برند، راهنمایی فروش و دستیار داخلی تیم پشتیبانی و مدیریت.',
    accent: 'violet',
    defaultFeatures: [
      'اتصال به پایگاه دانش و فایل‌های کسب‌وکار',
      'پاسخ‌گویی سریع فارسی ۲۴/۷',
      'ثبت و دسته‌بندی سرنخ‌های فروش',
    ],
    defaultIntegrations: ['وب‌سایت', 'CRM و گوگل شیت'],
  },
  {
    id: 'ai-phone-receptionist',
    titleFa: 'منشی تلفنی و اپراتور صوتی هوشمند',
    titleEn: 'AI Phone Receptionist',
    shortDesc:
      'پاسخ‌گویی صوتی طبیعی به تماس‌های ورودی، پاسخ به پرسش‌های پرتکرار، دریافت اطلاعات تماس‌گیرنده و ثبت خودکار درخواست.',
    accent: 'crimson',
    defaultFeatures: [
      'پاسخ‌گویی صوتی هوشمند فارسی',
      'ارجاع هوشمند به کارشناس انسانی',
      'ثبت خودکار خلاصه تماس و پیگیری',
    ],
    defaultIntegrations: ['تلفن و VoIP', 'CRM و گوگل شیت'],
  },
  {
    id: 'ai-booking-system',
    titleFa: 'سیستم رزرو و نوبت‌دهی هوشمند',
    titleEn: 'AI Booking System',
    shortDesc:
      'رزرو خودکار نوبت بدون تداخل، مدیریت ظرفیت پرسنل، ارسال یادآوری خودکار و تغییر یا لغو نوبت از طریق گفت‌وگوی هوشمند.',
    accent: 'cyan',
    defaultFeatures: [
      'مدیریت خودکار تقویم و جلوگیری از تداخل',
      'یادآوری هوشمند جلسات و کارها',
      'ثبت و تأیید نوبت بدون نیاز به اپراتور',
    ],
    defaultIntegrations: ['وب‌سایت', 'تقویم و نوبت‌دهی', 'تلگرام'],
  },
  {
    id: 'business-automation',
    titleFa: 'اتوماسیون هوشمند کسب‌وکار',
    titleEn: 'Business Automation',
    shortDesc:
      'خودکارسازی گردش‌کارهای تکراری، اتصال فرم‌ها و سفارش‌ها به CRM، گزارش‌گیری تحلیلی و اجرای خودکار فرآیندهای تیمی.',
    accent: 'violet',
    defaultFeatures: [
      'اتصال خودکار فرآیندها و وب‌هوک‌ها',
      'داشبورد گزارش‌گیری و تحلیل عملکرد',
      'ثبت و دسته‌بندی سرنخ‌های فروش',
    ],
    defaultIntegrations: ['CRM و گوگل شیت', 'API اختصاصی'],
  },
  {
    id: 'web-telegram-assistant',
    titleFa: 'دستیار هوشمند وب‌سایت و تلگرام',
    titleEn: 'Website and Telegram AI Assistant',
    shortDesc:
      'چت‌بات یکپارچه روی وب‌سایت و ربات تلگرام برای معرفی خدمات، راهنمایی خرید، پاسخ آنی به کاربران و انتقال به تیم فروش.',
    accent: 'crimson',
    defaultFeatures: [
      'پاسخ‌گویی سریع فارسی ۲۴/۷',
      'اتصال به پایگاه دانش و فایل‌های کسب‌وکار',
      'ارجاع هوشمند به کارشناس انسانی',
    ],
    defaultIntegrations: ['وب‌سایت', 'تلگرام'],
  },
] as const

export type AIProjectCategoryId = (typeof AI_PROJECT_CATEGORIES)[number]['id']

export const AI_PROJECT_CATEGORY_IDS = AI_PROJECT_CATEGORIES.map((c) => c.id) as [
  AIProjectCategoryId,
  ...AIProjectCategoryId[],
]

export const AI_PROJECT_FEATURE_OPTIONS = [
  'پاسخ‌گویی سریع فارسی ۲۴/۷',
  'اتصال به پایگاه دانش و فایل‌های کسب‌وکار',
  'ثبت و دسته‌بندی سرنخ‌های فروش',
  'پاسخ‌گویی صوتی هوشمند فارسی',
  'مدیریت خودکار تقویم و جلوگیری از تداخل',
  'یادآوری هوشمند جلسات و کارها',
  'خلاصه‌سازی پیام‌ها و ایمیل‌ها',
  'اتصال خودکار فرآیندها و وب‌هوک‌ها',
  'داشبورد گزارش‌گیری و تحلیل عملکرد',
  'ارجاع هوشمند به کارشناس انسانی',
  'ثبت و تأیید نوبت بدون نیاز به اپراتور',
  'ثبت خودکار خلاصه تماس و پیگیری',
] as const

export const AI_PROJECT_INTEGRATION_OPTIONS = [
  'وب‌سایت',
  'تلگرام',
  'واتساپ',
  'اینستاگرام',
  'تلفن و VoIP',
  'CRM و گوگل شیت',
  'تقویم و نوبت‌دهی',
  'API اختصاصی',
] as const

export const AI_PROJECT_STATUSES = [
  'NEW',
  'UNDER_REVIEW',
  'WAITING_FOR_CUSTOMER',
  'QUOTATION_SENT',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
] as const

export type AIProjectStatus = (typeof AI_PROJECT_STATUSES)[number]

export const AI_PROJECT_STATUS_LABELS: Record<AIProjectStatus, string> = {
  NEW: 'جدید',
  UNDER_REVIEW: 'در حال بررسی',
  WAITING_FOR_CUSTOMER: 'در انتظار پاسخ مشتری',
  QUOTATION_SENT: 'پیش‌فاکتور ارسال شده',
  APPROVED: 'تأیید شده',
  IN_PROGRESS: 'در حال اجرا',
  COMPLETED: 'تکمیل شده',
  REJECTED: 'رد شده',
}

export const AI_PROJECT_USAGE_SCOPES = ['PERSONAL', 'BUSINESS'] as const
export type AIProjectUsageScope = (typeof AI_PROJECT_USAGE_SCOPES)[number]

export const AI_PROJECT_USAGE_LABELS: Record<AIProjectUsageScope, string> = {
  PERSONAL: 'استفاده شخصی',
  BUSINESS: 'کسب‌وکار / سازمانی',
}

export const AI_PROJECT_PRICING_LABEL = 'دریافت مشاوره و استعلام قیمت'

export function getAIProjectCategory(id: string) {
  return AI_PROJECT_CATEGORIES.find((c) => c.id === id) ?? null
}

export function getAIProjectStatusLabel(status: string): string {
  if (status in AI_PROJECT_STATUS_LABELS) {
    return AI_PROJECT_STATUS_LABELS[status as AIProjectStatus]
  }
  return status
}

export const aiProjectRequestSchema = z
  .object({
    projectType: z.enum(AI_PROJECT_CATEGORY_IDS),
    usageScope: z.enum(AI_PROJECT_USAGE_SCOPES),
    features: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
    integrations: z.array(z.string().trim().min(1).max(120)).max(16).default([]),
    expectedFunctionality: z
      .string()
      .trim()
      .min(8, 'لطفاً عملکرد مورد انتظار سیستم را حداقل در ۸ کاراکتر توضیح دهید.')
      .max(2500, 'متن عملکرد مورد انتظار بیش از حد مجاز است.'),
    additionalDescription: z
      .string()
      .trim()
      .max(2500, 'توضیحات تکمیلی بیش از حد مجاز است.')
      .optional()
      .default(''),
    contactName: z
      .string()
      .trim()
      .min(2, 'لطفاً نام و نام خانوادگی خود را وارد کنید.')
      .max(120, 'نام واردشده طولانی است.'),
    contactPhone: z
      .string()
      .trim()
      .max(40, 'شماره تماس نامعتبر است.')
      .optional()
      .default(''),
    contactEmail: z
      .string()
      .trim()
      .max(160, 'ایمیل واردشده طولانی است.')
      .optional()
      .default(''),
    contactTelegram: z
      .string()
      .trim()
      .max(80, 'آیدی تلگرام واردشده طولانی است.')
      .optional()
      .default(''),
  })
  .superRefine((data, ctx) => {
    const hasPhone = data.contactPhone.length >= 7
    const hasEmail = data.contactEmail.length > 0
    const hasTelegram = data.contactTelegram.length >= 2

    if (!hasPhone && !hasEmail && !hasTelegram) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactPhone'],
        message: 'حداقل یک راه ارتباطی معتبر (شماره تماس، ایمیل یا آیدی تلگرام) وارد کنید.',
      })
    }

    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactEmail'],
        message: 'فرمت ایمیل معتبر نیست.',
      })
    }
  })

export type AIProjectRequestInput = z.infer<typeof aiProjectRequestSchema>

export const adminUpdateAiProjectSchema = z.object({
  status: z.enum(AI_PROJECT_STATUSES),
  proposedPrice: z
    .union([z.number().finite().positive().max(500_000_000_000), z.null()])
    .optional(),
  estimatedDelivery: z.string().trim().max(160).optional().default(''),
  internalNote: z.string().trim().max(4000).optional().default(''),
})

export type AdminUpdateAiProjectInput = z.infer<typeof adminUpdateAiProjectSchema>

export type StoredAIProjectPayload = {
  __mrrobotAiProjectV1: true
  referenceCode: string
  projectType: AIProjectCategoryId
  projectTypeTitleFa: string
  projectTypeTitleEn: string
  usageScope: AIProjectUsageScope
  features: string[]
  integrations: string[]
  expectedFunctionality: string
  additionalDescription: string
  contactName: string
  contactPhone: string
  contactEmail: string
  contactTelegram: string
  ticketId: string | null
  proposedPrice: number | null
  estimatedDelivery: string
  internalNote: string
  updatedByAdmin?: string
  updatedAt?: string
}

export type ParsedAIProjectRecord = {
  id: string
  title: string
  status: string
  contact: string
  delivery: string | null
  createdAt: string
  updatedAt: string
  customerId: string | null
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  isStructured: boolean
  referenceCode: string
  projectType: AIProjectCategoryId | null
  projectTypeTitleFa: string
  usageScope: AIProjectUsageScope | null
  features: string[]
  integrations: string[]
  expectedFunctionality: string
  additionalDescription: string
  contactName: string
  contactPhone: string
  contactEmail: string
  contactTelegram: string
  ticketId: string | null
  proposedPrice: number | null
  estimatedDelivery: string
  internalNote: string
}

export function generateProjectReferenceCode(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()
  return `MR-AI-${compact || 'REQ'}`
}

export function formatContactSummary(input: {
  contactPhone?: string
  contactEmail?: string
  contactTelegram?: string
}): string {
  const parts: string[] = []
  if (input.contactPhone?.trim()) parts.push(input.contactPhone.trim())
  if (input.contactEmail?.trim()) parts.push(input.contactEmail.trim())
  if (input.contactTelegram?.trim()) {
    const tg = input.contactTelegram.trim()
    parts.push(tg.startsWith('@') ? tg : `@${tg}`)
  }
  return parts.join(' | ') || '—'
}

export function formatDeliverySummary(
  proposedPrice: number | null | undefined,
  estimatedDelivery: string | undefined,
): string | null {
  const parts: string[] = []
  if (typeof proposedPrice === 'number' && Number.isFinite(proposedPrice) && proposedPrice > 0) {
    parts.push(`قیمت پیشنهادی: ${proposedPrice.toLocaleString('fa-IR')} تومان`)
  }
  if (estimatedDelivery?.trim()) {
    parts.push(`زمان تحویل: ${estimatedDelivery.trim()}`)
  }
  return parts.length > 0 ? parts.join(' | ') : null
}

export function serializeAIProjectPayload(payload: StoredAIProjectPayload): string {
  return JSON.stringify(payload)
}

export function parseAIProjectRecord(row: {
  id: string
  title: string
  description: string
  status: string
  contact: string
  delivery: string | null
  createdAt: Date | string
  updatedAt: Date | string
  customerId: string | null
  customer?: { name: string; email: string | null; phone: string | null } | null
}): ParsedAIProjectRecord {
  const createdAt =
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
  const updatedAt =
    row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)

  try {
    const raw = JSON.parse(row.description) as Partial<StoredAIProjectPayload> | null
    if (raw && raw.__mrrobotAiProjectV1 === true) {
      const category = raw.projectType ? getAIProjectCategory(raw.projectType) : null
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        contact: row.contact,
        delivery: row.delivery,
        createdAt,
        updatedAt,
        customerId: row.customerId,
        customerName: row.customer?.name ?? null,
        customerEmail: row.customer?.email ?? null,
        customerPhone: row.customer?.phone ?? null,
        isStructured: true,
        referenceCode: raw.referenceCode || generateProjectReferenceCode(row.id),
        projectType: category ? category.id : null,
        projectTypeTitleFa: raw.projectTypeTitleFa || category?.titleFa || row.title,
        usageScope:
          raw.usageScope === 'PERSONAL' || raw.usageScope === 'BUSINESS'
            ? raw.usageScope
            : null,
        features: Array.isArray(raw.features)
          ? raw.features.filter((x): x is string => typeof x === 'string')
          : [],
        integrations: Array.isArray(raw.integrations)
          ? raw.integrations.filter((x): x is string => typeof x === 'string')
          : [],
        expectedFunctionality:
          typeof raw.expectedFunctionality === 'string' ? raw.expectedFunctionality : '',
        additionalDescription:
          typeof raw.additionalDescription === 'string' ? raw.additionalDescription : '',
        contactName:
          typeof raw.contactName === 'string' && raw.contactName.trim()
            ? raw.contactName
            : row.customer?.name || 'مشتری',
        contactPhone:
          typeof raw.contactPhone === 'string'
            ? raw.contactPhone
            : row.customer?.phone || '',
        contactEmail:
          typeof raw.contactEmail === 'string'
            ? raw.contactEmail
            : row.customer?.email || '',
        contactTelegram:
          typeof raw.contactTelegram === 'string' ? raw.contactTelegram : '',
        ticketId: typeof raw.ticketId === 'string' ? raw.ticketId : null,
        proposedPrice:
          typeof raw.proposedPrice === 'number' && Number.isFinite(raw.proposedPrice)
            ? raw.proposedPrice
            : null,
        estimatedDelivery:
          typeof raw.estimatedDelivery === 'string' ? raw.estimatedDelivery : '',
        internalNote: typeof raw.internalNote === 'string' ? raw.internalNote : '',
      }
    }
  } catch {
    // Fall back to legacy plain-text AIServiceRequest format cleanly
  }

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    contact: row.contact,
    delivery: row.delivery,
    createdAt,
    updatedAt,
    customerId: row.customerId,
    customerName: row.customer?.name ?? null,
    customerEmail: row.customer?.email ?? null,
    customerPhone: row.customer?.phone ?? null,
    isStructured: false,
    referenceCode: generateProjectReferenceCode(row.id),
    projectType: null,
    projectTypeTitleFa: row.title,
    usageScope: null,
    features: [],
    integrations: [],
    expectedFunctionality: row.description,
    additionalDescription: '',
    contactName: row.customer?.name || 'مشتری',
    contactPhone: row.customer?.phone || (!row.contact.includes('@') ? row.contact : ''),
    contactEmail: row.customer?.email || (row.contact.includes('@') ? row.contact : ''),
    contactTelegram: '',
    ticketId: null,
    proposedPrice: null,
    estimatedDelivery: row.delivery || '',
    internalNote: '',
  }
}

export function buildSafeContactLinks(input: {
  phone?: string
  email?: string
  telegram?: string
}) {
  const phoneClean = (input.phone ?? '').replace(/[^\d+]/g, '')
  const emailClean = (input.email ?? '').trim()
  const telegramClean = (input.telegram ?? '')
    .trim()
    .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '')
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9_]/g, '')

  return {
    telHref: phoneClean.length >= 7 ? `tel:${phoneClean}` : null,
    mailtoHref: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)
      ? `mailto:${emailClean}`
      : null,
    telegramHref: telegramClean.length >= 3 ? `https://t.me/${telegramClean}` : null,
  }
}
