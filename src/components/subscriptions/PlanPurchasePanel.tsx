'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { effectiveUnitPrice } from '@/modules/commerce/unit-price'
import { formatStoreMoney } from '@/modules/commerce/money'
import { formatPlanDuration } from '@/modules/commerce/plan-labels'
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
  plans: StorePlan[]
}

export function PlanPurchasePanel({
  productId,
  productName,
  productSlug,
  plansEnabled,
  legacyPrice,
  legacyPromo,
  plans,
}: Props) {
  const defaultPlanId = plans.find((p) => p.isFeatured)?.id ?? plans[0]?.id ?? ''
  const [planId, setPlanId] = useState(defaultPlanId)
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

  function buyHref() {
    const q = plansEnabled && planId ? `?planId=${encodeURIComponent(planId)}` : ''
    return `/subscriptions/${productSlug}/buy${q}`
  }

  function handleAddToCart() {
    setFeedback(null)
    const targetPlanId = plansEnabled ? planId : null
    const label = selected && productName
      ? `${productName} — ${selected.title}`
      : productName

    start(async () => {
      if (cart) {
        const res = await cart.addItem(productId, 1, targetPlanId, { label })
        if (res.ok) {
          setFeedback({
            kind: 'ok',
            text: selected
              ? `طرح «${selected.title}» با موفقیت به سبد خرید اضافه شد.`
              : 'محصول با موفقیت به سبد خرید اضافه شد.',
          })
        } else {
          setFeedback({ kind: 'err', text: res.error || 'افزودن به سبد خرید ناموفق بود.' })
        }
        return
      }
      const res = await addToCart(productId, 1, targetPlanId)
      if (res.ok) {
        setFeedback({ kind: 'ok', text: 'محصول با موفقیت به سبد خرید اضافه شد.' })
      } else {
        setFeedback({ kind: 'err', text: res.error })
      }
    })
  }

  if (plansEnabled && plans.length === 0) {
    return <p className="text-sm text-amber-300">در حال حاضر طرح فعالی برای خرید وجود ندارد.</p>
  }

  return (
    <div className="space-y-4">
      {plansEnabled && plans.length > 0 ? (
        <div role="radiogroup" aria-label="انتخاب طرح" className="grid gap-3 sm:grid-cols-1">
          {plans.map((p) => {
            const active = p.id === planId
            const u = effectiveUnitPrice(p.price, p.promoPrice)
            return (
              <label
                key={p.id}
                className={`block cursor-pointer rounded-xl border p-4 transition ${
                  active ? 'border-mr-red bg-mr-red/10' : 'border-mr-border hover:border-mr-red/40'
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
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {p.title}
                      {p.isFeatured ? (
                        <span className="mr-2 rounded bg-mr-red/20 px-2 py-0.5 text-xs text-mr-red">
                          پیشنهادی
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-mr-muted">
                      {formatPlanDuration(p.durationValue, p.durationUnit)}
                    </p>
                    {p.description ? <p className="mt-2 text-sm text-white/75">{p.description}</p> : null}
                  </div>
                  <div className="shrink-0 text-left" dir="ltr">
                    <p className="font-bold tabular-nums">{u != null ? formatStoreMoney(u) : '—'}</p>
                    {p.promoPrice != null && p.promoPrice < p.price ? (
                      <p className="text-xs text-mr-muted line-through">{formatStoreMoney(p.price)}</p>
                    ) : null}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      ) : null}

      <div className="border-t border-mr-border pt-4">
        <p className="text-sm text-mr-muted">مبلغ انتخاب‌شده</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {unit != null ? formatStoreMoney(unit) : 'تماس بگیرید'}
        </p>
        {list != null && unit != null && list > unit ? (
          <p className="text-sm text-mr-muted line-through">{formatStoreMoney(list)}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {unit != null ? (
          <>
            <Link
              href={buyHref()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-mr-red px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              خرید اشتراک
            </Link>
            <button
              type="button"
              disabled={pending || Boolean(cart?.isLoading) || (plansEnabled && !planId)}
              onClick={handleAddToCart}
              className="min-h-[44px] rounded-xl border border-mr-border px-5 py-3 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-60"
            >
              {pending ? 'در حال افزودن...' : 'افزودن به سبد'}
            </button>
          </>
        ) : (
          <Link
            href={`/contact?subject=${encodeURIComponent(`خرید ${productName || 'اشتراک'}`)}`}
            className="text-mr-red underline"
          >
            تماس برای خرید
          </Link>
        )}
      </div>

      {feedback ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.kind === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          <p>{feedback.text}</p>
          {feedback.kind === 'ok' ? (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <Link href="/cart" className="font-semibold text-emerald-200 underline">
                مشاهده سبد خرید
              </Link>
              <Link href="/checkout" className="font-semibold text-white underline">
                ادامه تسویه‌حساب
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}