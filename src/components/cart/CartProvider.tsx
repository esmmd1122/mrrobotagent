'use client'

import { usePathname } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addToCart,
  pruneUnavailableCartItems,
  removeFromCart,
  setCartQuantity,
} from '@/app/cart/actions'
import type { CartPricing } from '@/modules/commerce/types'
import { STORE_CURRENCY_CODE } from '@/modules/commerce/money'

export type CinemaNavBridge = {
  isCinemaHome: boolean
  activeChapterId: string
  reducedMotion: boolean
  toggleReducedMotion: () => void
  openGlbModal: () => void
}

type CartActionOutcome = {
  ok: boolean
  error?: string
}

type CartContextValue = {
  pricing: CartPricing
  count: number
  staleCount: number
  isLoading: boolean
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
  refreshCart: () => Promise<void>
  addItem: (
    productId: string,
    quantity?: number,
    planId?: string | null,
    options?: { label?: string; openAfterAdd?: boolean },
  ) => Promise<CartActionOutcome>
  updateQuantity: (
    productId: string,
    quantity: number,
    planId?: string | null,
  ) => Promise<CartActionOutcome>
  removeItem: (productId: string, planId?: string | null) => Promise<CartActionOutcome>
  pruneUnavailable: () => Promise<void>
  showToast: (message: string) => void
  cinemaBridge: CinemaNavBridge | null
  setCinemaBridge: (bridge: CinemaNavBridge | null) => void
}

const EMPTY_PRICING: CartPricing = {
  lines: [],
  subtotal: 0,
  discountAmount: 0,
  total: 0,
  discountCode: null,
  currency: STORE_CURRENCY_CODE,
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({
  initialPricing,
  initialCount,
  initialStaleCount = 0,
  children,
}: {
  initialPricing?: CartPricing
  initialCount?: number
  initialStaleCount?: number
  children: ReactNode
}) {
  const pathname = usePathname()
  const [pricing, setPricing] = useState<CartPricing>(initialPricing ?? EMPTY_PRICING)
  const [count, setCount] = useState<number>(
    initialCount ?? (initialPricing?.lines.reduce((s, l) => s + l.quantity, 0) ?? 0),
  )
  const [staleCount, setStaleCount] = useState<number>(initialStaleCount)
  const [isLoading, setIsLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [cinemaBridge, setCinemaBridge] = useState<CinemaNavBridge | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedPathRef = useRef<string>(pathname)

  const showToast = useCallback((message: string) => {
    setToastMsg(message)
    setToastVisible(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false)
    }, 3400)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch('/api/store/cart', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as {
        count: number
        staleCount?: number
        pricing: CartPricing
      }
      if (data?.pricing) {
        setPricing(data.pricing)
        setCount(typeof data.count === 'number' ? data.count : 0)
        setStaleCount(typeof data.staleCount === 'number' ? data.staleCount : 0)
      }
    } catch {
      // Keep current cart snapshot if transient fetch fails
    }
  }, [])

  // Keep Navbar badge & CartDrawer synchronized after server-side cookie changes (e.g. checkout clearCart)
  useEffect(() => {
    if (mountedPathRef.current !== pathname) {
      mountedPathRef.current = pathname
      void refreshCart()
    }
  }, [pathname, refreshCart])

  const addItem = useCallback(
    async (
      productId: string,
      quantity = 1,
      planId?: string | null,
      options?: { label?: string; openAfterAdd?: boolean },
    ): Promise<CartActionOutcome> => {
      setIsLoading(true)
      try {
        const result = await addToCart(productId, quantity, planId)
        await refreshCart()
        if (!result.ok) {
          showToast(result.error)
          return { ok: false, error: result.error }
        }
        if (options?.label) {
          showToast(`«${options.label}» به سبد سفارش اضافه شد`)
        } else {
          showToast('محصول با موفقیت به سبد سفارش اضافه شد')
        }
        if (options?.openAfterAdd) {
          setDrawerOpen(true)
        }
        return { ok: true }
      } catch {
        const fallback = 'افزودن به سبد خرید با خطا مواجه شد. لطفاً دوباره تلاش کنید.'
        showToast(fallback)
        return { ok: false, error: fallback }
      } finally {
        setIsLoading(false)
      }
    },
    [refreshCart, showToast],
  )

  const updateQuantity = useCallback(
    async (
      productId: string,
      quantity: number,
      planId?: string | null,
    ): Promise<CartActionOutcome> => {
      setIsLoading(true)
      try {
        const result = await setCartQuantity(productId, quantity, planId)
        await refreshCart()
        if (!result.ok) {
          showToast(result.error)
          return { ok: false, error: result.error }
        }
        return { ok: true }
      } catch {
        const fallback = 'به‌روزرسانی تعداد با خطا مواجه شد.'
        showToast(fallback)
        return { ok: false, error: fallback }
      } finally {
        setIsLoading(false)
      }
    },
    [refreshCart, showToast],
  )

  const removeItem = useCallback(
    async (productId: string, planId?: string | null): Promise<CartActionOutcome> => {
      setIsLoading(true)
      try {
        const result = await removeFromCart(productId, planId)
        await refreshCart()
        if (!result.ok) {
          showToast(result.error)
          return { ok: false, error: result.error }
        }
        showToast('مورد از سبد سفارش حذف شد')
        return { ok: true }
      } catch {
        const fallback = 'حذف مورد از سبد با خطا مواجه شد.'
        showToast(fallback)
        return { ok: false, error: fallback }
      } finally {
        setIsLoading(false)
      }
    },
    [refreshCart, showToast],
  )

  const pruneUnavailable = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await pruneUnavailableCartItems()
      await refreshCart()
      if (result.ok) {
        showToast('اقلام ناموجود از سبد خرید حذف شدند.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [refreshCart, showToast])

  const openDrawer = useCallback(() => {
    setDrawerOpen(true)
    void refreshCart()
  }, [refreshCart])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => {
    setDrawerOpen((prev) => {
      const next = !prev
      if (next) void refreshCart()
      return next
    })
  }, [refreshCart])

  return (
    <CartContext.Provider
      value={{
        pricing,
        count,
        staleCount,
        isLoading,
        drawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        refreshCart,
        addItem,
        updateQuantity,
        removeItem,
        pruneUnavailable,
        showToast,
        cinemaBridge,
        setCinemaBridge,
      }}
    >
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`cinema-toast ${toastVisible ? 'is-visible' : ''}`}
      >
        {toastMsg}
      </div>
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}

export function useOptionalCart() {
  return useContext(CartContext)
}
