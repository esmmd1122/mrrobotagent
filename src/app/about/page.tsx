import type { Metadata } from 'next'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'درباره MR.ROBOT',
}

export default function AboutPage() {
  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8 lg:items-center">
        <div>
          <p className="text-xs tracking-widest text-mr-red">ABOUT</p>
          <h1 className="mt-3 text-4xl font-bold">درباره MR.ROBOT</h1>
          <p className="mt-6 text-mr-muted leading-relaxed">
            MR.ROBOT برند خدمات دیجیتال پریمیوم است که اشتراک‌های حرفه‌ای و
            راهکارهای هوش مصنوعی را با هویت بصری سینمایی و پشتیبانی انسانی
            ارائه می‌دهد. تمرکز ما بر اعتماد، شفافیت و تجربه‌ای است که شبیه
            یک شرکت فناوری بین‌المللی باشد — نه یک قالب آماده.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/90">
            <li>• هوشمند، حرفه‌ای و آینده‌نگر</li>
            <li>• پشتیبانی اختصاصی برای فعال‌سازی و مشاوره</li>
            <li>• معماری آماده برای حساب کاربری، پرداخت و پنل مدیریت</li>
          </ul>
          <div className="mt-10">
            <Button href="/contact">تماس با ما</Button>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <Image
            src="/images/mr-robot-character.png"
            alt="MR.ROBOT"
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 80vw, 400px"
          />
        </div>
      </div>
    </div>
  )
}
