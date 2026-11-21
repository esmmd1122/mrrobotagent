'use client'

import { useState, useTransition } from 'react'
import { addToCart } from '@/app/cart/actions'
import { useOptionalCart } from '@/components/cart/CartProvider'

type Props = {
  productId: string
  planId?: string | null
  productLabel?: string
  label?: string
  className?: string
  openDrawerAfterAdd?: boolean
}

export function AddToCartButton({
  productId,
  planId = null,
  productLabel,
  label = 'افزودن به سبد',
  className = 'rounded-xl bg-mr-red px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60',
  openDrawerAfterAdd = false,
}: Props) {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const cart = useOptionalCart()

  function handleClick() {
    setError('')
    start(async () => {
      if (cart) {
        const res = await cart.addItem(productId, 1, planId, {
          label: productLabel,
          openAfterAdd: openDrawerAfterAdd,
        })
        if (!res.ok && res.error) setError(res.error)
        return
      }
      const res = await addToCart(productId, 1, planId)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="inline-flex flex-col">
      <button
        type="button"
        disabled={pending || Boolean(cart?.isLoading)}
        onClick={handleClick}
        className={className}
      >
        {pending ? 'در حال افزودن...' : label}
      </button>
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  )
}