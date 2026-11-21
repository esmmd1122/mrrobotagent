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
    headline: 'نسل نوین خدمات دیجیتال با امضای MR.ROBOT',
    slogan: 'با مستر ربات فکرتو نذار',
    subtitle: 'دنیای دیجیتال، یک قدم جلوتر',
    description:
      'مرجع تخصصی اشتراک‌های هوش مصنوعی، سرویس‌های امن VPN و V2Ray، خدمات اپل آیدی و آیکلود، تعمیرات تخصصی موبایل و محصولات دیجیتال — در تجربه‌ای شفاف، سریع و قابل اعتماد.',
    announcementEnabled: false,
    announcementText: '',
    ctaPrimary: { label: 'ورود به فروشگاه سه‌بعدی', href: '#marketplace' },
    ctaSecondary: { label: 'مشاهده دسته‌بندی خدمات', href: '#services' },
    characterImageUrl: '/images/mr-robot-character.png',
    cinematicBgUrl: '/images/mr-robot-cinematic.jpg',
    bannerImageUrl: '',
    bannerAlt: 'بنر اختصاصی MR.ROBOT',
    featuredProductSlugs: [],
    showSectionPreviews: true,
  },
  sections: [
    {
      id: 'intro',
      enabled: true,
      sortOrder: 1,
      title: 'تخصص فنی عمیق، در کنار تجربه خریدی ساده و مطمئن',
      description:
        'در MR.ROBOT پیچیدگی‌های فنی دنیای سایبری و ابزارهای جهانی به خدماتی شفاف، امن و قابل دسترس تبدیل می‌شوند.',
      imageUrl: '',
      imageAlt: '',
    },
    {
      id: 'services',
      enabled: true,
      sortOrder: 2,
      title: 'تمام نیازهای دیجیتال شما در یک مجموعه یکپارچه',
      description:
        'دسته‌بندی مورد نظر خود را انتخاب کنید تا جزئیات سرویس را ببینید، به سبد سفارش اضافه کنید یا درخواست اختصاصی ثبت نمایید.',
      imageUrl: '',
      imageAlt: '',
    },
    {
      id: 'subscriptions',
      enabled: true,
      sortOrder: 3,
      title: 'محصول را سه‌بعدی بررسی کنید و آسان سفارش دهید',
      description:
        'دسترسی به ابزارهای حرفه‌ای دنیای دیجیتال، با خدمات اختصاصی MR.ROBOT',
      imageUrl: '',
      imageAlt: '',
    },
    {
      id: 'ai',
      enabled: true,
      sortOrder: 4,
      title: 'ابزار هوشمند مناسب مسیر کاری خود را انتخاب کنید',
      description:
        'حوزه فعالیت یا نیاز هوشمند خود را مشخص کنید تا MR.ROBOT راهکار دقیق اتوماسیون یا اشتراک هوش مصنوعی متناسب با کار شما را آماده کند.',
      imageUrl: '',
      imageAlt: '',
    },
    {
      id: 'other',
      enabled: true,
      sortOrder: 5,
      title: 'رسیدگی دقیق به اکوسیستم اپل و تلفن همراه شما',
      description:
        'از ساخت و مدیریت ایمن اپل آیدی و ارتقای فضای آیکلود تا عیب‌یابی تخصصی و خدمات نرم‌افزاری و سخت‌افزاری موبایل با استاندارد حرفه‌ای.',
      imageUrl: '',
      imageAlt: '',
    },
    {
      id: 'trust',
      enabled: true,
      sortOrder: 6,
      title: 'خرید مطمئن با شفافیت و همراهی واقعی',
      description:
        'تمام سفارش‌ها، محاسبه قیمت‌ها، تحویل فایل‌ها و پشتیبانی فنی مستقیماً در زیرساخت یکپارچه MR.ROBOT مدیریت و پیگیری می‌شوند.',
      imageUrl: '',
      imageAlt: '',
    },
    {
      id: 'finale',
      enabled: true,
      sortOrder: 7,
      title: 'آماده ارتقای تجربه دیجیتال خود هستید؟',
      description:
        'از اشتراک‌های هوش مصنوعی و دسترسی امن تا خدمات تخصصی اپل و موبایل؛ همه چیز با نظم، زیبایی و اطمینان در اختیار شماست.',
      imageUrl: '',
      imageAlt: '',
    },
  ],
  navigation: {
    header: [
      { id: 'home', label: 'خانه', href: '/', enabled: true },
      { id: 'shop', label: 'فروشگاه', href: '/shop', enabled: true },
      { id: 'subs', label: 'اشتراک‌های دیجیتال', href: '/#marketplace', enabled: true },
      { id: 'ai', label: 'MR.ROBOT AI', href: '/#ai-experience', enabled: true },
      { id: 'other', label: 'اپل و موبایل', href: '/#apple-mobile', enabled: true },
      { id: 'about', label: 'درباره ما', href: '/about', enabled: true },
      { id: 'contact', label: 'تماس', href: '/contact', enabled: true },
    ],
    footerQuickLinks: [
      {
        id: 'f-subs',
        label: 'اشتراک‌های دیجیتال',
        href: '/#marketplace',
        enabled: true,
      },
      { id: 'f-ai', label: 'MR.ROBOT AI', href: '/#ai-experience', enabled: true },
      { id: 'f-contact', label: 'تماس و درخواست', href: '/contact', enabled: true },
    ],
    purchaseCta: { label: 'خرید اشتراک', href: '/shop' },
  },
  footer: {
    tagline:
      'پلتفرم خدمات دیجیتال پریمیوم؛ اشتراک‌های حرفه‌ای، خدمات اپل و راهکارهای هوش مصنوعی برای زندگی و کسب‌وکار.',
    columnTitleLinks: 'مسیرهای سریع',
    columnTitleFuture: 'پشتیبانی و ارتباط مستقیم',
    futureText:
      'پشتیبانی تیکتی، تحویل شفاف سفارش‌ها در حساب کاربری و مشاوره تخصصی پیش از خرید در تمام روزهای هفته.',
    contactPhone: '',
    contactEmail: '',
    contactAddress: '',
    supportHours: 'همه‌روزه ۹ تا ۲۳',
    social: { telegram: '', instagram: '', twitter: '' },
  },
  seo: {
    homeTitle: 'MR.ROBOT | خدمات دیجیتال پریمیوم',
    homeDescription:
      'با مستر ربات فکرتو نذار — اشتراک‌های دیجیتال، خدمات اپل و راهکارهای هوش مصنوعی برای زندگی و کسب‌وکار.',
    ogImageUrl: '',
    ogImageAlt: 'MR.ROBOT AI Tech Store',
  },
}
