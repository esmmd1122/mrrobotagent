'use client'

import { useState, useTransition } from 'react'
import { Loader2, ShoppingBag } from 'lucide-react'
import { addToCart } from '@/app/cart/actions'
import { useOptionalCart } from '@/components/cart/CartProvider'

type Props = {
  productId: string
  planId?: string | null
  productLabel?: string
  label?: string
  className?: string
  openDrawerAfterAdd?: boolean
  showIcon?: boolean
}

export function AddToCartButton({
  productId,
  planId = null,
  productLabel,
  label = 'افزودن به سبد',
  className = 'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-[#e10600]/45 bg-[#151722] px-3.5 py-2 text-sm font-semibold text-white transition hover:border-[#e10600] hover:bg-[#e10600]/15 disabled:opacity-60',
  openDrawerAfterAdd = false,
  showIcon = true,
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
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#ff4d48]" />
        ) : showIcon ? (
          <ShoppingBag className="h-4 w-4 text-[#ff4d48]" />
        ) : null}
        <span>{pending ? 'در حال افزودن...' : label}</span>
      </button>
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  )
}