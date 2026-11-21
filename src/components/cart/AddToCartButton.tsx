'use client'

import { useTransition } from 'react'
import { addToCart } from '@/app/cart/actions'
import { useOptionalCart } from '@/components/cart/CartProvider'

export function AddToCartButton({ productId, label = 'افزودن به سبد' }: { productId: string; label?: string }) {
  const [pending, start] = useTransition()
  const cart = useOptionalCart()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await addToCart(productId, 1)
          if (cart) {
            await cart.refreshCart()
            cart.showToast('محصول به سبد سفارش اضافه شد')
          }
        })
      }
      className="rounded-xl bg-mr-red px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? '...' : label}
    </button>
  )
}