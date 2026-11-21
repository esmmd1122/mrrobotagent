'use client'

import { useState, useTransition } from 'react'
import { isSafePaymentRedirectUrl } from '@/modules/payment/labels'

export function AccountStartPaymentButton({ orderNumber }: { orderNumber: string }) {
  const [pending, start] = useTransition()
  const [message, setMessage] = useState('')

  function pay() {
    start(async () => {
      setMessage('')
      try {
        const idempotencyKey = crypto.randomUUID()
        const res = await fetch('/api/store/payments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderNumber, idempotencyKey }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setMessage(data.error || 'شروع پرداخت ناموفق بود.')
          return
        }
        if (typeof data.redirectUrl === 'string' && isSafePaymentRedirectUrl(data.redirectUrl)) {
          window.location.href = data.redirectUrl
          return
        }
        setMessage('آدرس انتقال به درگاه پرداخت معتبر نیست.')
      } catch {
        setMessage('ارتباط با سرور پرداخت برقرار نشد. لطفاً دوباره تلاش کنید.')
      }
    })
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={pay}
        disabled={pending}
        className="w-full min-h-[44px] rounded-xl bg-mr-red py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'در حال اتصال به درگاه...' : 'پرداخت آنلاین (حساب کاربری)'}
      </button>
      {message ? <p className="mt-2 text-xs text-amber-300">{message}</p> : null}
    </div>
  )
}