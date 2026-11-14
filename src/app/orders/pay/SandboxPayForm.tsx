'use client'

import { useTransition } from 'react'
import { confirmSandboxPayment } from './actions'

export function SandboxPayForm({
  paymentId,
  orderNumber,
  amount,
  exp,
  proof,
  viewToken,
}: {
  paymentId: string
  orderNumber: string
  amount: number
  exp: string
  proof: string
  viewToken?: string
}) {
  const [pending, start] = useTransition()

  return (
    <form
      className="space-y-3"
      action={(fd) => {
        fd.set('paymentId', paymentId)
        fd.set('orderNumber', orderNumber)
        fd.set('amount', String(amount))
        fd.set('exp', exp)
        fd.set('proof', proof)
        if (viewToken) fd.set('viewToken', viewToken)
        start(() => confirmSandboxPayment(fd))
      }}
    >
      <p className="text-xs text-amber-200/90">
        با تأیید، سرور امضای داخلی را بررسی می‌کند؛ بدون تأیید معتبر سفارش PAID نمی‌شود.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 py-3 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? 'در حال تأیید...' : 'تأیید پرداخت آزمایشی (سرور)'}
      </button>
    </form>
  )
}