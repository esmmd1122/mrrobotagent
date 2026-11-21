'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { pruneUnavailableCartItems } from '@/app/cart/actions'
import { useOptionalCart } from '@/components/cart/CartProvider'

export function PruneStaleCartButton() {
  const [pending, start] = useTransition()
  const router = useRouter()
  const cart = useOptionalCart()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await pruneUnavailableCartItems()
          if (cart) {
            await cart.refreshCart()
            if (res.ok) cart.showToast('اقلام ناموجود از سبد خرید حذف شدند.')
          }
          router.refresh()
        })
      }
      className="mt-2 inline-flex min-h-[38px] items-center rounded-lg border border-amber-400/50 bg-amber-500/20 px-4 py-1.5 text-xs font-semibold text-amber-50 transition hover:bg-amber-500/30 disabled:opacity-60"
    >
      {pending ? 'در حال پاکسازی...' : 'حذف اقلام ناموجود از سبد'}
    </button>
  )
}
