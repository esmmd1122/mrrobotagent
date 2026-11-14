'use client'

import { useTransition } from 'react'
import { submitCheckout } from './actions'

export function CheckoutForm({ idempotencyKey }: { idempotencyKey: string }) {
  const [pending, start] = useTransition()

  return (
    <form
      className="card-shop mt-6 space-y-4 p-6"
      action={(fd) => start(() => submitCheckout(fd))}
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <label className="block text-sm">
        نام و نام خانوادگی *
        <input name="name" required className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2" />
      </label>
      <label className="block text-sm">
        ایمیل
        <input
          name="email"
          type="email"
          className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
          dir="ltr"
        />
      </label>
      <label className="block text-sm">
        موبایل
        <input
          name="phone"
          className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
          dir="ltr"
          placeholder="09xxxxxxxxx"
        />
      </label>
      <label className="block text-sm">
        کد تخفیف
        <input
          name="discountCode"
          className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
          dir="ltr"
          autoComplete="off"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input name="termsAccepted" type="checkbox" value="on" required className="mt-1" />
        <span>
          قوانین و شرایط استفاده از خدمات دیجیتال MR.ROBOT را می‌پذیرم و می‌دانم تحویل اولیه به‌صورت دستی انجام
          می‌شود تا پرداخت آنلاین فعال شود.
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-mr-red py-3 font-semibold disabled:opacity-60"
      >
        {pending ? 'در حال ثبت و اتصال به درگاه...' : 'تأیید و پرداخت'}
      </button>
    </form>
  )
}