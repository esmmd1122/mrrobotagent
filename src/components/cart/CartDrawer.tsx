'use client'

import Link from 'next/link'
import { useEffect, useTransition } from 'react'
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2, X, ArrowLeft, ShieldCheck } from 'lucide-react'
import { goToCheckout } from '@/app/cart/actions'
import { useCart } from '@/components/cart/CartProvider'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { formatStoreMoney } from '@/modules/commerce/money'
import { computeCartSavings } from '@/modules/commerce/storefront-presenters'

function toFaDigits(value: number | string) {
  return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

export function CartDrawer() {
  const {
    pricing,
    count,
    staleCount,
    isLoading,
    drawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    pruneUnavailable,
  } = useCart()
  const [checkoutPending, startCheckout] = useTransition()

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, closeDrawer])

  const hasLines = pricing.lines.length > 0
  const catalogSavings = computeCartSavings(pricing.lines)

  return (
    <>
      <div
        className={`cinema-backdrop ${drawerOpen ? 'is-open' : ''}`}
        onClick={closeDrawer}
        aria-hidden={!drawerOpen}
      />
      <aside
        className={`cinema-order-drawer ${drawerOpen ? 'is-open' : ''}`}
        aria-label="سبد سفارش"
        aria-hidden={!drawerOpen}
      >
        <div className="cinema-drawer-head">
          <div>
            <h3 className="text-[1.08rem] font-extrabold text-white">سبد سفارش شما</h3>
            <p className="text-xs text-[#7c92b8]">
              {hasLines
                ? `${toFaDigits(count)} مورد با قیمت محاسبه‌شده در سرور`
                : 'سفارش شما به صورت امن ثبت و پیگیری می‌شود'}
            </p>
          </div>
          <button
            type="button"
            className="cinema-icon-close"
            onClick={closeDrawer}
            aria-label="بستن سبد سفارش"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="cinema-drawer-list">
          {staleCount > 0 ? (
            <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div className="space-y-2">
                  <p>
                    {toFaDigits(staleCount)} مورد ناموجود یا تغییر‌یافته در سبد شما وجود دارد و پیش از تسویه‌حساب باید حذف شود.
                  </p>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void pruneUnavailable()}
                    className="rounded-lg border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 font-semibold text-amber-50 hover:bg-amber-500/30 disabled:opacity-60"
                  >
                    حذف اقلام ناموجود
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!hasLines ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#7c92b8]">
              <ShoppingBag className="mb-3 h-10 w-10 text-[#38bdf8]/60" />
              <p className="mb-1 text-sm font-semibold text-white/90">سبد سفارش شما خالی است.</p>
              <p className="max-w-xs text-xs leading-relaxed">
                هر اشتراک، پلن یا محصول دیجیتال را از فروشگاه انتخاب کنید تا در این سبد نمایش داده شود.
              </p>
              <Link
                href="/shop"
                onClick={closeDrawer}
                className="cinema-btn cinema-btn-buy cinema-btn-sm mt-5"
              >
                مشاهده فروشگاه کامل
              </Link>
            </div>
          ) : (
            pricing.lines.map((item) => (
              <div
                key={`${item.productId}-${item.planId ?? 'base'}`}
                className="cinema-bag-row"
              >
                <Link
                  href={`/subscriptions/${item.slug}`}
                  onClick={closeDrawer}
                  className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#121622]"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ProductLogo
                      slug={
                        item.slug as
                          | 'chatgpt-plus'
                          | 'capcut-pro'
                          | 'grok'
                          | 'gemini-pro'
                      }
                    />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/subscriptions/${item.slug}`}
                    onClick={closeDrawer}
                    className="block truncate text-sm font-bold text-white hover:text-[#38bdf8]"
                  >
                    {item.productName}
                  </Link>
                  {item.planTitle ? (
                    <span className="mt-0.5 block truncate text-xs text-[#38bdf8]">
                      {item.planTitle}
                    </span>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#a8bad8] tabular-nums">
                    <span>
                      {formatStoreMoney(item.unitPrice, pricing.currency)} × {toFaDigits(item.quantity)}
                    </span>
                    {item.listUnitPrice > item.unitPrice ? (
                      <span className="text-[11px] text-[#7c92b8] line-through">
                        {formatStoreMoney(item.listUnitPrice, pricing.currency)}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-0.5 block text-xs font-semibold text-white/95 tabular-nums">
                    {formatStoreMoney(item.lineTotal, pricing.currency)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void updateQuantity(item.productId, item.quantity - 1, item.planId)}
                    className="cinema-qty-btn"
                    aria-label={`کاهش تعداد ${item.productName}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-6 text-center text-sm font-semibold text-white tabular-nums">
                    {toFaDigits(item.quantity)}
                  </span>
                  <button
                    type="button"
                    disabled={isLoading || item.quantity >= 99}
                    onClick={() => void updateQuantity(item.productId, item.quantity + 1, item.planId)}
                    className="cinema-qty-btn"
                    aria-label={`افزایش تعداد ${item.productName}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void removeItem(item.productId, item.planId)}
                    className="cinema-qty-btn text-[#ff8da1] hover:border-[#ef1d42]/60"
                    aria-label={`حذف ${item.productName} از سبد`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cinema-drawer-foot">
          {hasLines && catalogSavings > 0 ? (
            <div className="mb-2 flex items-center justify-between gap-3 text-xs text-emerald-300 tabular-nums">
              <span>سود شما از تخفیف محصولات</span>
              <span className="font-semibold">
                {formatStoreMoney(catalogSavings, pricing.currency)}
              </span>
            </div>
          ) : null}

          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-white">جمع کل قابل پرداخت</span>
            <span className="cinema-price-chip tabular-nums">
              {hasLines ? formatStoreMoney(pricing.total, pricing.currency) : '۰ تومان'}
            </span>
          </div>

          {hasLines ? (
            <p className="mb-3 flex items-center gap-1.5 text-[11px] text-[#7c92b8]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]" />
              <span>کد تخفیف در مرحله بعد (تسویه‌حساب) قابل اعمال است.</span>
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={!hasLines || staleCount > 0 || isLoading || checkoutPending}
              onClick={() => {
                startCheckout(async () => {
                  closeDrawer()
                  await goToCheckout()
                })
              }}
              className="cinema-btn cinema-btn-signature w-full disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span>{checkoutPending ? 'در حال انتقال به تسویه...' : 'ادامه و تسویه حساب'}</span>
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="cinema-btn cinema-btn-subtle cinema-btn-sm w-full"
            >
              مشاهده صفحه کامل سبد خرید
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
