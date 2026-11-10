export type OtherService = {
  id: string
  title: string
  description: string
  bullets: string[]
}

export const otherServices: OtherService[] = [
  {
    id: 'apple-id',
    title: 'خدمات Apple ID',
    description: 'راه‌اندازی، بازیابی و پشتیبانی حرفه‌ای حساب‌های Apple.',
    bullets: ['ایجاد و تأیید هویت', 'بازیابی دسترسی', 'مشاوره امنیتی'],
  },
  {
    id: 'icloud',
    title: 'پشتیبانی iCloud',
    description: 'پیکربندی فضای ابری و همگام‌سازی بین دستگاه‌های Apple.',
    bullets: ['افزایش فضا', 'بکاپ‌گیری', 'رفع خطاهای همگام‌سازی'],
  },
  {
    id: 'telegram-premium',
    title: 'Telegram Premium و خدمات مرتبط',
    description: 'فعال‌سازی اشتراک پریمیوم و خدمات تکمیلی تلگرام.',
    bullets: ['Premium', 'استیکر و امکانات ویژه', 'راهنمای استفاده حرفه‌ای'],
  },
]
