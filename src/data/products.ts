export type SubscriptionProduct = {
  slug: string
  name: string
  nameEn: string
  description: string
  details: string[]
  features: string[]
}

export const subscriptionProducts: SubscriptionProduct[] = [
  {
    slug: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    nameEn: 'ChatGPT Plus',
    description:
      'دستیار گفت‌وگوی پیشرفته OpenAI برای نوشتن، تحقیق، کدنویسی و کار خلاقانه حرفه‌ای.',
    details: [
      'دسترسی به مدل‌های پیشرفته',
      'پاسخ‌دهی سریع‌تر در ساعات اوج',
      'ابزارهای توسعه‌یافته برای تولید محتوا',
    ],
    features: ['مناسب فریلنسرها', 'پشتیبانی MR.ROBOT در فعال‌سازی'],
  },
  {
    slug: 'capcut-pro',
    name: 'CapCut Pro',
    nameEn: 'CapCut Pro',
    description:
      'ویرایش ویدیو حرفه‌ای با افکت‌ها، قالب‌ها و ابزارهای پیشرفته برای شبکه‌های اجتماعی.',
    details: [
      'ابزارهای ویرایش پیشرفته',
      'قالب‌های آماده و افکت‌های سینمایی',
      'خروجی با کیفیت بالا',
    ],
    features: ['مناسب تولیدکنندگان محتوا', 'راهنمای نصب اختصاصی'],
  },
  {
    slug: 'grok',
    name: 'Grok',
    nameEn: 'Grok',
    description:
      'دستیار هوش مصنوعی با تمرکز بر پاسخ‌های به‌روز و تحلیل سریع برای تصمیم‌گیری روزانه.',
    details: [
      'دسترسی به قابلیت‌های پیشرفته',
      'مناسب پژوهش و ایده‌پردازی',
      'یکپارچه با اکوسیستم xAI',
    ],
    features: ['برای کسب‌وکارهای نوآور', 'مشاوره انتخاب پلن'],
  },
  {
    slug: 'gemini-pro',
    name: 'Gemini Pro',
    nameEn: 'Gemini Pro',
    description:
      'هوش مصنوعی Google برای متن، تحلیل و همکاری تیمی در پروژه‌های دیجیتال.',
    details: [
      'مدل‌های Pro برای کار حرفه‌ای',
      'یکپارچگی با ابزارهای Google',
      'تحلیل چندرسانه‌ای',
    ],
    features: ['تیم‌های مارکتینگ', 'پشتیبانی فعال‌سازی'],
  },
]

export function getProductBySlug(slug: string) {
  return subscriptionProducts.find((p) => p.slug === slug)
}
