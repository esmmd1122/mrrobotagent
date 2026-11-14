'use client'

import { useTransition } from 'react'
import { addToCart } from '@/app/cart/actions'

export function AddToCartButton({ productId, label = 'افزودن به سبد' }: { productId: string; label?: string }) {
  const [pending, start] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => addToCart(productId, 1))}
      className="rounded-xl bg-mr-red px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? '...' : label}
    </button>
  )
}