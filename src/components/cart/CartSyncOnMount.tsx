'use client'

import { useEffect } from 'react'
import { useOptionalCart } from '@/components/cart/CartProvider'

/** Triggers a fresh cart cookie read on mount (e.g. after checkout clears cart server-side). */
export function CartSyncOnMount() {
  const cart = useOptionalCart()
  useEffect(() => {
    if (cart) {
      void cart.refreshCart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
