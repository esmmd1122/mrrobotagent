'use client'

import { useRef, useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2, Lock, Tag } from 'lucide-react'
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
  const submittingRef = useRef(false)
  const [clientError, setClientError] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [discountChecking, setDiscountChecking] = useState(false)
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null)
  const [discountError, setDiscountError] = useState('')

  const effectiveTotal = discountPreview ? discountPreview.total : subtotal

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
    if (submittingRef.current || pending) return
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

    submittingRef.current = true
    start(async () => {
      try {
        await submitCheckout(fd)
      } finally {
        submittingRef.current = false
      }
    })
  }

  return (
    <form
      className="mt-6 space-y-5 rounded-2xl border border-white/12 bg-[#0d1018] p-6"
      action={handleAction}
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      {clientError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span>{clientError}</span>
        </div>
      ) : null}

      <div className="space-y-4">
        <label className="block text-sm font-semibold text-white/90">
          نام و نام خانوادگی *
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={defaultName}
            placeholder="نام کامل خریدار"
            className="mt-1.5 w-full min-h-[44px] rounded-xl border border-white/15 bg-[#121622] px-3.5 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-[#7c92b8] focus:border-[#e10600]/70"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-white/90">
            ایمیل
            <input
              name="email"
              type="email"
              defaultValue={defaultEmail}
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-white/15 bg-[#121622] px-3.5 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-[#7c92b8] focus:border-[#e10600]/70"
              dir="ltr"
              placeholder="name@example.com"
            />
          </label>
          <label className="block text-sm font-semibold text-white/90">
            شماره موبایل
            <input
              name="phone"
              defaultValue={defaultPhone}
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-white/15 bg-[#121622] px-3.5 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-[#7c92b8] focus:border-[#e10600]/70"
              dir="ltr"
              placeholder="09xxxxxxxxx"
            />
          </label>
        </div>
        <p className="text-xs text-[#a8bad8]">
          وارد کردن حداقل یکی از ایمیل یا شماره موبایل برای ثبت، ارسال اطلاعات تحویل و پیگیری سفارش الزامی است.
        </p>
      </div>

      <div className="border-t border-white/10 pt-4">
        <label className="block text-sm font-semibold text-white/90">
          <span className="inline-flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-[#38bdf8]" />
            <span>کد تخفیف (اختیاری)</span>
          </span>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <input
              name="discountCode"
              value={discountInput}
              onChange={(e) => {
                setDiscountInput(e.target.value)
                setDiscountPreview(null)
                setDiscountError('')
              }}
              className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#121622] px-3.5 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-[#7c92b8] focus:border-[#38bdf8]/70"
              dir="ltr"
              autoComplete="off"
              placeholder="مثال: WELCOME10"
            />
            <button
              type="button"
              disabled={discountChecking || !discountInput.trim()}
              onClick={() => void checkDiscount()}
              className="min-h-[44px] shrink-0 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white transition hover:border-white/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {discountChecking ? 'در حال بررسی...' : 'اعمال کد'}
            </button>
          </div>
        </label>
        {discountError ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{discountError}</span>
          </p>
        ) : null}
        {discountPreview ? (
          <div className="mt-2.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-100">
            <p className="flex items-center gap-1.5 font-semibold text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                کد <strong dir="ltr">{discountPreview.code}</strong> اعمال شد — تخفیف:{' '}
                <strong className="tabular-nums">
                  {formatStoreMoney(discountPreview.discountAmount, currency)}
                </strong>
              </span>
            </p>
            <p className="mt-1 text-emerald-100/90">
              مبلغ نهایی پس از تخفیف:{' '}
              <strong className="tabular-nums text-white">
                {formatStoreMoney(discountPreview.total, currency)}
              </strong>
            </p>
          </div>
        ) : null}
      </div>

      {!onlinePaymentAvailable ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-100">
          درگاه پرداخت آنلاین در حال حاضر غیرفعال است. سفارش شما با مبلغ{' '}
          <strong className="tabular-nums text-white">
            {formatStoreMoney(effectiveTotal, currency)}
          </strong>{' '}
          و وضعیت «در انتظار پرداخت» ثبت می‌شود تا از طریق پشتیبانی هماهنگی پرداخت و فعال‌سازی انجام شود.
        </div>
      ) : null}

      <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-[#d7e2f5] sm:text-sm">
        <input
          name="termsAccepted"
          type="checkbox"
          value="on"
          required
          className="mt-1 h-4 w-4 shrink-0 accent-[#e10600]"
        />
        <span>
          قوانین و شرایط استفاده از خدمات دیجیتال MR.ROBOT را می‌پذیرم و از وضعیت پرداخت و تحویل سفارش مطلع هستم.
        </span>
      </label>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#a8bad8]">مبلغ نهایی قابل ثبت</span>
          <span className="text-lg font-black text-white tabular-nums">
            {formatStoreMoney(effectiveTotal, currency)}
          </span>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#e10600]/25 transition hover:bg-[#c80500] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            {pending
              ? onlinePaymentAvailable
                ? 'در حال ثبت سفارش و اتصال به درگاه...'
                : 'در حال ثبت نهایی سفارش...'
              : onlinePaymentAvailable
                ? 'تأیید سفارش و انتقال به درگاه پرداخت'
                : 'ثبت نهایی سفارش'}
          </span>
        </button>
      </div>
    </form>
  )
}