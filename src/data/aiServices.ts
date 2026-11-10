export type AIService = {
  id: string
  title: string
  description: string
  useCase: string
  icon: 'assistant' | 'business' | 'voice' | 'booking' | 'orders' | 'workflow' | 'telegram'
}

export const aiServices: AIService[] = [
  {
    id: 'personal-assistant',
    title: 'دستیار هوش مصنوعی شخصی',
    description:
      'دستیری که برنامه روزانه، یادآوری‌ها و پاسخ‌های هوشمند را مطابق سبک زندگی شما مدیریت می‌کند.',
    useCase: 'مثال: یادآوری جلسات، خلاصه‌سازی ایمیل‌ها و پاسخ به سوالات روزمره.',
    icon: 'assistant',
  },
  {
    id: 'business-assistant',
    title: 'دستیار اختصاصی کسب‌وکار',
    description:
      'ربات سفارشی با دانش برند شما برای پشتیبانی داخلی، فروش و آموزش تیم.',
    useCase: 'مثال: پاسخ به سوالات پرتکرار مشتریان و راهنمای محصول.',
    icon: 'business',
  },
  {
    id: 'voice-operator',
    title: 'اپراتور صوتی هوشمند',
    description:
      'پاسخ‌گویی صوتی ۲۴ ساعته با لحن حرفه‌ای برای تماس‌ها و صف‌های پشتیبانی.',
    useCase: 'مثال: اعلام وضعیت سفارش و اتصال به اپراتور انسانی در صورت نیاز.',
    icon: 'voice',
  },
  {
    id: 'appointment-booking',
    title: 'رزرو خودکار نوبت',
    description:
      'سیستم رزرو هوشمند با تقویم، تأیید پیامکی و هماهنگی با تیم شما.',
    useCase: 'مثال: سالن زیبایی، کلینیک یا مشاوره آنلاین.',
    icon: 'booking',
  },
  {
    id: 'order-registration',
    title: 'ثبت خودکار سفارش',
    description:
      'دریافت سفارش از وب‌سایت، تلگرام یا واتساپ و ثبت در سیستم داخلی.',
    useCase: 'مثال: فروشگاه اینستاگرامی با ثبت خودکار در اکسل یا CRM.',
    icon: 'orders',
  },
  {
    id: 'workflow-automation',
    title: 'اتوماسیون فرایند کسب‌وکار',
    description:
      'اتصال ابزارها و خودکارسازی گزارش‌گیری، فاکتور و پیگیری وظایف.',
    useCase: 'مثال: ارسال خودکار گزارش فروش روزانه به مدیریت.',
    icon: 'workflow',
  },
  {
    id: 'telegram-bots',
    title: 'ربات تلگرام و سیستم‌های هوشمند',
    description:
      'ربات‌های سفارشی با پنل مدیریت، پرداخت و یکپارچه‌سازی با سرویس‌های شما.',
    useCase: 'مثال: فروش اشتراک، پشتیبانی و اطلاع‌رسانی کمپین.',
    icon: 'telegram',
  },
]
