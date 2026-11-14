'use client'

import { useTransition } from 'react'
import { removeFromCart, setCartQuantity } from '@/app/cart/actions'

export function CartLineActions({
  productId,
  planId,
  quantity,
}: {
  productId: string
  planId?: string | null
  quantity: number
}) {
  const [pending, start] = useTransition()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border border-mr-border">
        <button
          type="button"
          disabled={pending}
          className="px-3 py-1 text-lg"
          onClick={() => start(() => setCartQuantity(productId, quantity - 1, planId))}
          aria-label="کاهش"
        >
          −
        </button>
        <span className="min-w-[2rem] text-center text-sm tabular-nums">{quantity}</span>
        <button
          type="button"
          disabled={pending}
          className="px-3 py-1 text-lg"
          onClick={() => start(() => setCartQuantity(productId, quantity + 1, planId))}
          aria-label="افزایش"
        >
          +
        </button>
      </div>
      <button
        type="button"
        disabled={pending}
        className="text-xs text-mr-muted underline"
        onClick={() => start(() => removeFromCart(productId, planId))}
      >
        حذف
      </button>
    </div>
  )
}