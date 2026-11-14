'use client'

import { useState, useTransition } from 'react'

type Props = {
  orderNumber: string
  viewToken: string
}

export function StartPaymentButton({ orderNumber, viewToken }: Props) {
  const [pending, start] = useTransition()
  const [message, setMessage] = useState('')

  function pay() {
    start(async () => {
      setMessage('')
      const idempotencyKey = crypto.randomUUID()
      const res = await fetch('/api/store/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, viewToken, idempotencyKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'شروع پرداخت ناموفق بود.')
        return
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    })
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={pay}
        disabled={pending}
        className="w-full rounded-xl bg-mr-red py-3 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? 'در حال اتصال به درگاه...' : 'پرداخت امن'}
      </button>
      {message ? <p className="mt-2 text-xs text-amber-300">{message}</p> : null}
    </div>
  )
}