import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = {
  title: 'تماس',
}

export default function ContactPage() {
  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold">تماس با MR.ROBOT</h1>
        <p className="mt-4 text-mr-muted leading-relaxed">
          برای خرید اشتراک، درخواست سرویس هوش مصنوعی یا مشاوره خدمات دیجیتال،
          فرم زیر را تکمیل کنید. تیم ما در اسرع وقت پاسخ می‌دهد.
        </p>
        <div className="mt-10">
          <Suspense fallback={<div className="text-sm text-mr-muted">بارگذاری فرم...</div>}>
            <ContactForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
