'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Zap,
} from 'lucide-react'
import { effectiveUnitPrice } from '@/modules/commerce/unit-price'
import { formatStoreMoney } from '@/modules/commerce/money'
import { formatPlanDuration } from '@/modules/commerce/plan-labels'
import { calculateDiscountPercent } from '@/lib/site-config/cms-helpers'
import { addToCart } from '@/app/cart/actions'
import { useOptionalCart } from '@/components/cart/CartProvider'

export type StorePlan = {
  id: string
  title: string
  description: string | null
  price: number
  promoPrice: number | null
  durationValue: number | null
  durationUnit: string
  isFeatured: boolean
}

type Props = {
  productId: string
  productName?: string
  productSlug: string
  plansEnabled: boolean
  legacyPrice: number | null
  legacyPromo: number | null
  currency?: string
  plans: StorePlan[]
}

export function PlanPurchasePanel({
  productId,
  productName,
  productSlug,
  plansEnabled,
  legacyPrice,
  legacyPromo,
  currency = 'TOMAN',
  plans,
}: Props) {
  const defaultPlanId = plans.find((p) => p.isFeatured)?.id ?? plans[0]?.id ?? ''
  const [planId, setPlanId] = useState(defaultPlanId)
  const [quantity, setQuantity] = useState(1)
  const [pending, start] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const cart = useOptionalCart()

  const selected = useMemo(() => plans.find((p) => p.id === planId), [plans, planId])

  const unit = plansEnabled
    ? selected
      ? effectiveUnitPrice(selected.price, selected.promoPrice)
      : null
    : effectiveUnitPrice(legacyPrice, legacyPromo)

  const list = plansEnabled && selected ? selected.price : legacyPrice
  const discountPct = calculateDiscountPercent(list, unit)
  const totalForQty = unit != null ? unit * quantity : null

  function buyHref() {
    const q = plansEnabled && planId ? `?planId=${encodeURIComponent(planId)}` : ''
    return `/subscriptions/${productSlug}/buy${q}`
  }

  function handleAddToCart() {
    setFeedback(null)
    const targetPlanId = plansEnabled ? planId : null
    const label =
      selected && productName ? `${productName} — ${selected.title}` : productName

    start(async () => {
      if (cart) {
        const res = await cart.addItem(productId, quantity, targetPlanId, { label })
        if (res.ok) {
          setFeedback({
            kind: 'ok',
            text: selected
              ? `${quantity.toLocaleString('fa-IR')} عدد از طرح «${selected.title}» با موفقیت به سبد خرید اضافه شد.`
              : `${quantity.toLocaleString('fa-IR')} عدد با موفقیت به سبد خرید اضافه شد.`,
          })
        } else {
          setFeedback({ kind: 'err', text: res.error || 'افزودن به سبد خرید ناموفق بود.' })
        }
        return
      }
      const res = await addToCart(productId, quantity, targetPlanId)
      if (res.ok) {
        setFeedback({ kind: 'ok', text: 'محصول با موفقیت به سبد خرید اضافه شد.' })
      } else {
        setFeedback({ kind: 'err', text: res.error })
      }
    })
  }

  if (plansEnabled && plans.length === 0) {
    return (
      <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-amber-200">
        در حال حاضر طرح فعالی برای خرید وجود ندارد.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {plansEnabled && plans.length > 0 ? (
        <div role="radiogroup" aria-label="انتخاب طرح" className="grid gap-2.5">
          {plans.map((p) => {
            const active = p.id === planId
            const u = effectiveUnitPrice(p.price, p.promoPrice)
            const pct = calculateDiscountPercent(p.price, u)
            return (
              <label
                key={p.id}
                className={`block cursor-pointer rounded-xl border p-3.5 transition ${
                  active
                    ? 'border-[#e10600] bg-[#e10600]/12 shadow-sm shadow-[#e10600]/20'
                    : 'border-white/12 bg-[#121622] hover:border-[#e10600]/45'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  className="sr-only"
                  checked={active}
                  onChange={() => {
                    setPlanId(p.id)
                    setFeedback(null)
                  }}
                />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{p.title}</span>
                      {p.isFeatured ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#e10600]/25 px-1.5 py-0.5 text-[10px] font-bold text-[#ff6b66]">
                          <Sparkles className="h-3 w-3" />
                          پیشنهادی
                        </span>
                      ) : null}
                      {pct ? (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          {pct.toLocaleString('fa-IR')}٪ تخفیف
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#9eb2d2]">
                      {formatPlanDuration(p.durationValue, p.durationUnit)}
                    </p>
                    {p.description ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-white/75">
                        {p.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-left" dir="ltr">
                    <p className="text-sm font-black text-white tabular-nums">
                      {u != null ? formatStoreMoney(u, currency) : '—'}
                    </p>
                    {p.promoPrice != null && p.promoPrice < p.price ? (
                      <p className="text-[11px] text-white/45 line-through tabular-nums">
                        {formatStoreMoney(p.price, currency)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      ) : null}

      {/* Price Summary + Quantity Control */}
      <div className="rounded-xl border border-white/10 bg-[#121622] p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs text-[#9eb2d2]">
              {quantity > 1
                ? `مبلغ کل (${quantity.toLocaleString('fa-IR')} عدد)`
                : 'مبلغ انتخاب‌شده'}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <p className="text-2xl font-black text-white tabular-nums">
                {totalForQty != null ? formatStoreMoney(totalForQty, currency) : 'تماس بگیرید'}
              </p>
              {list != null && unit != null && list > unit ? (
                <p className="text-xs text-white/45 line-through tabular-nums">
                  {formatStoreMoney(list * quantity, currency)}
                </p>
              ) : null}
            </div>
          </div>

          {discountPct ? (
            <span className="rounded-md bg-[#e10600] px-2.5 py-1 text-xs font-extrabold text-white">
              {discountPct.toLocaleString('fa-IR')}٪ تخفیف
            </span>
          ) : null}
        </div>

        {unit != null ? (
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-xs font-medium text-white/75">تعداد برای افزودن به سبد</span>
            <div className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0b0d14] p-1">
              <button
                type="button"
                aria-label="کاهش تعداد"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-white/80 transition hover:bg-white/10 disabled:opacity-35"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2rem] text-center text-sm font-bold text-white tabular-nums">
                {quantity.toLocaleString('fa-IR')}
              </span>
              <button
                type="button"
                aria-label="افزایش تعداد"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                disabled={quantity >= 10}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-white/80 transition hover:bg-white/10 disabled:opacity-35"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Visually Distinct Brand-Aligned Purchase Buttons */}
      <div className="grid gap-2.5">
        {unit != null ? (
          <>
            <Link
              href={buyHref()}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#e10600]/25 transition hover:bg-[#c80500]"
            >
              <Zap className="h-4 w-4" />
              <span>خرید فوری و تسویه‌حساب</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <button
              type="button"
              disabled={pending || Boolean(cart?.isLoading) || (plansEnabled && !planId)}
              onClick={handleAddToCart}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-[#e10600]/55 bg-[#161926] px-5 py-3 text-sm font-bold text-white transition hover:border-[#e10600] hover:bg-[#e10600]/15 disabled:opacity-55"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#ff4d48]" />
              ) : (
                <ShoppingBag className="h-4 w-4 text-[#ff4d48]" />
              )}
              <span>{pending ? 'در حال افزودن به سبد...' : 'افزودن به سبد خرید'}</span>
            </button>
          </>
        ) : (
          <Link
            href={`/contact?subject=${encodeURIComponent(`خرید ${productName || 'اشتراک'}`)}`}
            className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[#e10600] px-5 py-3 text-sm font-bold text-white"
          >
            تماس برای خرید
          </Link>
        )}
      </div>

      {feedback ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs ${
            feedback.kind === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          <p className="flex items-start gap-2 font-medium">
            {feedback.kind === 'ok' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : null}
            <span>{feedback.text}</span>
          </p>
          {feedback.kind === 'ok' ? (
            <div className="mt-2.5 flex flex-wrap gap-3">
              <Link
                href="/checkout"
                className="inline-flex items-center gap-1 rounded-lg bg-[#e10600] px-3 py-1.5 font-bold text-white hover:bg-[#c80500]"
              >
                <span>ادامه تسویه‌حساب</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 px-3 py-1.5 font-semibold text-emerald-200 hover:bg-emerald-500/15"
              >
                مشاهده سبد خرید
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-white/80 hover:text-white"
              >
                ادامه خرید
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}