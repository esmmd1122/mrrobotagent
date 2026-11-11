import type { WebsiteConfig } from './types'

export const DEFAULT_WEBSITE_CONFIG: WebsiteConfig = {
  theme: {
    mode: 'dark',
    primaryColor: '#e10600',
    secondaryColor: '#121318',
    backgroundColor: '#050506',
    gradientEnabled: true,
    fontScale: 1,
    buttonRadius: 12,
    buttonBorderWidth: 1,
  },
  hero: {
    enabled: true,
    brandLabel: 'PREMIUM DIGITAL',
    slogan: 'با مستر ربات فکرتو نذار',
    subtitle: 'دنیای دیجیتال، یک قدم جلوتر',
    description: '',
    ctaPrimary: { label: 'خرید اشتراک', href: '/#subscriptions' },
    ctaSecondary: { label: 'خدمات هوش مصنوعی', href: '/#ai' },
    characterImageUrl: '/images/mr-robot-character.png',
    cinematicBgUrl: '/images/mr-robot-cinematic.jpg',
    showSectionPreviews: true,
  },
  sections: [
    {
      id: 'subscriptions',
      enabled: true,
      sortOrder: 1,
      title: 'خرید اشتراک‌های دیجیتال',
      description:
        'دسترسی به ابزارهای حرفه‌ای دنیای دیجیتال، با خدمات اختصاصی MR.ROBOT',
    },
    {
      id: 'ai',
      enabled: true,
      sortOrder: 2,
      title: 'MR.ROBOT AI',
      description: 'راهکارهای هوشمند برای زندگی و کسب‌وکار',
    },
    {
      id: 'other',
      enabled: true,
      sortOrder: 3,
      title: 'سایر خدمات دیجیتال',
      description:
        'خدمات تکمیلی برای اکوسیستم Apple و تلگرام — بدون نیاز به جستجوی پراکنده.',
    },
  ],
  navigation: {
    header: [
      { id: 'home', label: 'خانه', href: '/#home', enabled: true },
      {
        id: 'subs',
        label: 'اشتراک‌های دیجیتال',
        href: '/#subscriptions',
        enabled: true,
      },
      { id: 'ai', label: 'MR.ROBOT AI', href: '/#ai', enabled: true },
      { id: 'other', label: 'سایر خدمات', href: '/#other', enabled: true },
      { id: 'about', label: 'درباره MR.ROBOT', href: '/about', enabled: true },
      { id: 'contact', label: 'تماس', href: '/contact', enabled: true },
    ],
    footerQuickLinks: [
      {
        id: 'f-subs',
        label: 'اشتراک‌های دیجیتال',
        href: '/#subscriptions',
        enabled: true,
      },
      { id: 'f-ai', label: 'MR.ROBOT AI', href: '/#ai', enabled: true },
      { id: 'f-contact', label: 'تماس و درخواست', href: '/contact', enabled: true },
    ],
    purchaseCta: { label: 'خرید اشتراک', href: '/#subscriptions' },
  },
  footer: {
    tagline:
      'پلتفرم خدمات دیجیتال پریمیوم؛ اشتراک‌های حرفه‌ای و راهکارهای هوش مصنوعی برای زندگی و کسب‌وکار.',
    columnTitleLinks: 'مسیرهای سریع',
    columnTitleFuture: 'آینده پلتفرم',
    futureText:
      'حساب کاربری، پرداخت آنلاین، پیگیری سفارش و پنل مدیریت به‌زودی به معماری فعلی افزوده می‌شوند.',
    social: { telegram: '', instagram: '', twitter: '' },
  },
  seo: {
    homeTitle: 'MR.ROBOT | خدمات دیجیتال پریمیوم',
    homeDescription:
      'با مستر ربات فکرتو نذار — اشتراک‌های دیجیتال و راهکارهای هوش مصنوعی برای زندگی و کسب‌وکار.',
  },
}
