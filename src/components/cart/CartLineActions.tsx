'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { removeFromCart, setCartQuantity } from '@/app/cart/actions'
import { useOptionalCart } from '@/components/cart/CartProvider'

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
  const router = useRouter()
  const cart = useOptionalCart()

  function handleQuantity(nextQty: number) {
    start(async () => {
      const res = await setCartQuantity(productId, nextQty, planId)
      if (cart) {
        await cart.refreshCart()
        if (!res.ok) cart.showToast(res.error)
      }
      router.refresh()
    })
  }

  function handleRemove() {
    start(async () => {
      const res = await removeFromCart(productId, planId)
      if (cart) {
        await cart.refreshCart()
        cart.showToast(res.ok ? 'مورد از سبد خرید حذف شد' : res.error)
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border border-mr-border">
        <button
          type="button"
          disabled={pending}
          className="min-h-[38px] min-w-[38px] px-3 py-1 text-lg disabled:opacity-50"
          onClick={() => handleQuantity(quantity - 1)}
          aria-label="کاهش تعداد"
        >
          −
        </button>
        <span className="min-w-[2.25rem] text-center text-sm tabular-nums">{quantity}</span>
        <button
          type="button"
          disabled={pending || quantity >= 99}
          className="min-h-[38px] min-w-[38px] px-3 py-1 text-lg disabled:opacity-50"
          onClick={() => handleQuantity(quantity + 1)}
          aria-label="افزایش تعداد"
        >
          +
        </button>
      </div>
      <button
        type="button"
        disabled={pending}
        className="min-h-[38px] px-2 text-xs text-mr-muted underline hover:text-white disabled:opacity-50"
        onClick={handleRemove}
      >
        حذف
      </button>
    </div>
  )
}