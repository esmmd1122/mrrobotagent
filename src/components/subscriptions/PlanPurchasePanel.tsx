'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { effectiveUnitPrice } from '@/modules/commerce/unit-price'
import { formatStoreMoney } from '@/modules/commerce/money'
import { formatPlanDuration } from '@/modules/commerce/plan-labels'
import { addToCart } from '@/app/cart/actions'

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
  productSlug: string
  plansEnabled: boolean
  legacyPrice: number | null
  legacyPromo: number | null
  plans: StorePlan[]
}

export function PlanPurchasePanel({
  productId,
  productSlug,
  plansEnabled,
  legacyPrice,
  legacyPromo,
  plans,
}: Props) {
  const defaultPlanId = plans.find((p) => p.isFeatured)?.id ?? plans[0]?.id ?? ''
  const [planId, setPlanId] = useState(defaultPlanId)
  const [pending, start] = useTransition()

  const selected = useMemo(() => plans.find((p) => p.id === planId), [plans, planId])

  const unit = plansEnabled
    ? selected
      ? effectiveUnitPrice(selected.price, selected.promoPrice)
      : null
    : effectiveUnitPrice(legacyPrice, legacyPromo)

  const list = plansEnabled && selected ? selected.price : legacyPrice

  function buyHref() {
    const q = planId ? `?planId=${encodeURIComponent(planId)}` : ''
    return `/subscriptions/${productSlug}/buy${q}`
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
                  onChange={() => setPlanId(p.id)}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {p.title}
                      {p.isFeatured ? (
                        <span className="mr-2 rounded bg-mr-red/20 px-2 py-0.5 text-xs text-mr-red">پیشنهادی</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-mr-muted">{formatPlanDuration(p.durationValue, p.durationUnit)}</p>
                    {p.description ? <p className="mt-2 text-sm text-white/75">{p.description}</p> : null}
                  </div>
                  <div className="text-left" dir="ltr">
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
              className="inline-flex justify-center rounded-xl bg-mr-red px-5 py-3 text-sm font-semibold text-white"
            >
              خرید اشتراک
            </Link>
            <button
              type="button"
              disabled={pending || (plansEnabled && !planId)}
              onClick={() => start(() => addToCart(productId, 1, plansEnabled ? planId : undefined))}
              className="rounded-xl border border-mr-border px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {pending ? '...' : 'افزودن به سبد'}
            </button>
          </>
        ) : (
          <Link href={`/contact?subject=${encodeURIComponent('خرید اشتراک')}`} className="text-mr-red underline">
            تماس برای خرید
          </Link>
        )}
      </div>
    </div>
  )
}