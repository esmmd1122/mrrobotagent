'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'

export function ContactForm() {
  const searchParams = useSearchParams()
  const defaultSubject = searchParams.get('subject') ?? ''

  const [submitted, setSubmitted] = useState(false)

  const subjectPlaceholder = useMemo(
    () => defaultSubject || 'موضوع درخواست شما',
    [defaultSubject],
  )

  return (
    <form
      className="card-shop space-y-5 p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault()
        setSubmitted(true)
      }}
    >
      {submitted ? (
        <div className="rounded-xl border border-mr-red/30 bg-mr-red/10 p-6 text-center">
          <p className="font-semibold">پیام شما ثبت شد (نمایشی)</p>
          <p className="mt-2 text-sm text-mr-muted">
            ارسال واقعی به سرور و تیم پشتیبانی هنوز پیاده‌سازی نشده است. برای
            هماهنگی فوری، از کانال‌های مستقیم برند استفاده کنید.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label className="text-sm text-mr-muted" htmlFor="name">
              نام
            </label>
            <input
              id="name"
              name="name"
              required
              className="mt-2 w-full rounded-xl border border-mr-border bg-mr-black px-4 py-3 text-sm focus:border-mr-red/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-mr-muted" htmlFor="contact">
              راه ارتباطی (تلگرام / ایمیل)
            </label>
            <input
              id="contact"
              name="contact"
              required
              className="mt-2 w-full rounded-xl border border-mr-border bg-mr-black px-4 py-3 text-sm focus:border-mr-red/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-mr-muted" htmlFor="subject">
              موضوع
            </label>
            <input
              id="subject"
              name="subject"
              defaultValue={defaultSubject}
              placeholder={subjectPlaceholder}
              className="mt-2 w-full rounded-xl border border-mr-border bg-mr-black px-4 py-3 text-sm focus:border-mr-red/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-mr-muted" htmlFor="message">
              توضیحات
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              className="mt-2 w-full resize-y rounded-xl border border-mr-border bg-mr-black px-4 py-3 text-sm focus:border-mr-red/50 focus:outline-none"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            ارسال درخواست
          </Button>
        </>
      )}
    </form>
  )
}
