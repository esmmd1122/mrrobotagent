'use client'

import { useState, useTransition } from 'react'
import { formatStoreMoney } from '@/modules/commerce/money'
import { submitCheckout } from './actions'

type Props = {
  idempotencyKey: string
  defaultName?: string
  defaultEmail?: string
  defaultPhone?: string
  onlinePaymentAvailable: boolean
  subtotal: number
  currency: string
}

type DiscountPreview = {
  code: string
  discountAmount: number
  total: number
}

export function CheckoutForm({
  idempotencyKey,
  defaultName,
  defaultEmail,
  defaultPhone,
  onlinePaymentAvailable,
  subtotal,
  currency,
}: Props) {
  const [pending, start] = useTransition()
  const [clientError, setClientError] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [discountChecking, setDiscountChecking] = useState(false)
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null)
  const [discountError, setDiscountError] = useState('')

  async function checkDiscount() {
    const code = discountInput.trim()
    setDiscountError('')
    setDiscountPreview(null)
    if (!code) return

    setDiscountChecking(true)
    try {
      const res = await fetch('/api/store/discount/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setDiscountError(data.error || 'کد تخفیف معتبر نیست.')
        return
      }
      setDiscountPreview({
        code: data.code,
        discountAmount: data.discountAmount,
        total: data.total,
      })
    } catch {
      setDiscountError('بررسی کد تخفیف با خطا مواجه شد.')
    } finally {
      setDiscountChecking(false)
    }
  }

  function handleAction(fd: FormData) {
    setClientError('')
    const name = String(fd.get('name') || '').trim()
    const email = String(fd.get('email') || '').trim()
    const phone = String(fd.get('phone') || '').trim()
    const terms = fd.get('termsAccepted') === 'on'

    if (name.length < 2) {
      setClientError('نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد.')
      return
    }
    if (!email && !phone) {
      setClientError('وارد کردن حداقل ایمیل یا شماره موبایل برای ثبت و پیگیری سفارش الزامی است.')
      return
    }
    if (!terms) {
      setClientError('لطفاً قوانین و شرایط استفاده از خدمات را بپذیرید.')
      return
    }

    start(() => submitCheckout(fd))
  }

  return (
    <form className="card-shop mt-6 space-y-4 p-6" action={handleAction}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      {clientError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {clientError}
        </p>
      ) : null}

      <label className="block text-sm">
        نام و نام خانوادگی *
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={defaultName}
          className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2.5"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          ایمیل
          <input
            name="email"
            type="email"
            defaultValue={defaultEmail}
            className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2.5"
            dir="ltr"
            placeholder="name@example.com"
          />
        </label>
        <label className="block text-sm">
          شماره موبایل
          <input
            name="phone"
            defaultValue={defaultPhone}
            className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2.5"
            dir="ltr"
            placeholder="09xxxxxxxxx"
          />
        </label>
      </div>
      <p className="text-xs text-mr-muted">
        وارد کردن حداقل یکی از ایمیل یا شماره موبایل برای ثبت و پیگیری سفارش الزامی است.
      </p>

      <div>
        <label className="block text-sm">
          کد تخفیف (اختیاری)
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              name="discountCode"
              value={discountInput}
              onChange={(e) => {
                setDiscountInput(e.target.value)
                setDiscountPreview(null)
                setDiscountError('')
              }}
              className="w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2.5"
              dir="ltr"
              autoComplete="off"
              placeholder="مثال: WELCOME10"
            />
            <button
              type="button"
              disabled={discountChecking || !discountInput.trim()}
              onClick={() => void checkDiscount()}
              className="shrink-0 rounded-lg border border-mr-border px-4 py-2.5 text-xs font-semibold hover:bg-white/5 disabled:opacity-50"
            >
              {discountChecking ? 'در حال بررسی...' : 'بررسی کد'}
            </button>
          </div>
        </label>
        {discountError ? <p className="mt-1.5 text-xs text-red-300">{discountError}</p> : null}
        {discountPreview ? (
          <div className="mt-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            <p>
              کد <strong dir="ltr">{discountPreview.code}</strong> اعمال شد — تخفیف:{' '}
              <strong className="tabular-nums">
                {formatStoreMoney(discountPreview.discountAmount, currency)}
              </strong>
            </p>
            <p className="mt-1">
              مبلغ نهایی پس از تخفیف:{' '}
              <strong className="tabular-nums">
                {formatStoreMoney(discountPreview.total, currency)}
              </strong>
            </p>
          </div>
        ) : null}
      </div>

      {!onlinePaymentAvailable ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-100">
          درگاه پرداخت آنلاین در حال حاضر غیرفعال است. سفارش شما با مبلغ{' '}
          <strong className="tabular-nums">
            {formatStoreMoney(discountPreview ? discountPreview.total : subtotal, currency)}
          </strong>{' '}
          و وضعیت «در انتظار پرداخت» در سیستم ثبت می‌شود تا از طریق پشتیبانی هماهنگی پرداخت و فعال‌سازی انجام شود.
        </div>
      ) : null}

      <label className="flex items-start gap-2.5 text-sm">
        <input name="termsAccepted" type="checkbox" value="on" required className="mt-1 h-4 w-4" />
        <span>
          قوانین و شرایط استفاده از خدمات دیجیتال MR.ROBOT را می‌پذیرم و از وضعیت پرداخت و تحویل سفارش مطلع هستم.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[46px] rounded-xl bg-mr-red py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending
          ? onlinePaymentAvailable
            ? 'در حال ثبت سفارش و اتصال به درگاه...'
            : 'در حال ثبت سفارش...'
          : onlinePaymentAvailable
            ? 'تأیید و پرداخت'
            : 'ثبت نهایی سفارش'}
      </button>
    </form>
  )
}