import Link from 'next/link'
import { ArrowLeft, ShieldCheck, ShoppingBag, Store } from 'lucide-react'
import { prisma } from '@/lib/db'
import { readCart } from '@/modules/commerce/cart-cookie'
import { calculateCartPricing, formatStoreMoney } from '@/modules/commerce/pricing'
import { resolveStorefrontErrorMessage } from '@/modules/commerce/error-messages'
import { CartLineActions } from '@/components/cart/CartLineActions'
import { PruneStaleCartButton } from '@/components/cart/PruneStaleCartButton'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { goToCheckout } from './actions'

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const lines = await readCart()
  const pricing = await calculateCartPricing(lines)
  const rawError = (await searchParams).error
  const errorMessage = resolveStorefrontErrorMessage(rawError)
  const staleCount = Math.max(0, lines.length - pricing.lines.length)

  // Fetch product thumbnails for cart lines (display-only; pricing logic untouched)
  const productIds = Array.from(new Set(pricing.lines.map((l) => l.productId)))
  const imageByProductId = new Map<string, string | null>()
  if (productIds.length > 0) {
    try {
      const rows = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, imageUrl: true },
      })
      for (const r of rows) imageByProductId.set(r.id, r.imageUrl)
    } catch {
      /* non-blocking thumbnail lookup */
    }
  }

  return (
    <div className="section-glow pt-28 pb-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.26em] text-[#e10600]">SHOPPING CART</p>
            <h1 className="mt-1 text-3xl font-black text-white">سبد خرید</h1>
          </div>
          <Link
            href="/shop"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/85 transition hover:border-white/30 hover:text-white"
          >
            <Store className="h-4 w-4 text-[#38bdf8]" />
            <span>ادامه خرید در فروشگاه</span>
          </Link>
        </div>

        {errorMessage ? (
          <p className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {errorMessage}
          </p>
        ) : null}

        {staleCount > 0 ? (
          <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p>
              {staleCount.toLocaleString('fa-IR')} مورد در سبد خرید شما دیگر موجود نیست یا قیمت/طرح آن تغییر کرده است. برای ادامه تسویه‌حساب آن را حذف کنید.
            </p>
            <PruneStaleCartButton />
          </div>
        ) : null}

        {pricing.lines.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#0d1018] p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/60">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-white">سبد خرید شما در حال حاضر خالی است.</p>
            <p className="mt-1.5 text-sm text-[#a8bad8]">
              برای انتخاب اشتراک‌های هوش مصنوعی و خدمات دیجیتال وارد فروشگاه شوید.
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#e10600] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#e10600]/25 transition hover:bg-[#c80500]"
            >
              <span>مشاهده فروشگاه</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start">
            <div className="space-y-3 lg:col-span-7">
              {pricing.lines.map((line) => {
                const thumbUrl = imageByProductId.get(line.productId)
                return (
                  <article
                    key={`${line.productId}:${line.planId || ''}`}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0d1018] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <Link
                        href={`/subscriptions/${line.slug}`}
                        className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#121622] flex items-center justify-center"
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={line.productName}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ProductLogo
                            slug={
                              line.slug as
                                | 'chatgpt-plus'
                                | 'capcut-pro'
                                | 'grok'
                                | 'gemini-pro'
                            }
                          />
                        )}
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/subscriptions/${line.slug}`}
                          className="block break-words text-sm font-bold text-white transition hover:text-[#ff4d48]"
                        >
                          {line.productName}
                        </Link>
                        {line.planTitle ? (
                          <p className="mt-0.5 text-xs text-[#38bdf8]">
                            طرح انتخابی: {line.planTitle}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-[#a8bad8] tabular-nums">
                          {formatStoreMoney(line.unitPrice, pricing.currency)} ×{' '}
                          {line.quantity.toLocaleString('fa-IR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-center justify-between gap-2 border-t border-white/10 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                      <p className="text-sm font-extrabold text-white tabular-nums">
                        {formatStoreMoney(line.lineTotal, pricing.currency)}
                      </p>
                      <CartLineActions
                        productId={line.productId}
                        planId={line.planId}
                        quantity={line.quantity}
                      />
                    </div>
                  </article>
                )
              })}
            </div>

            <aside className="rounded-2xl border border-white/12 bg-[#0d1018] p-5 space-y-4 lg:sticky lg:top-28 lg:col-span-5">
              <h2 className="border-b border-white/10 pb-3 text-base font-extrabold text-white">
                خلاصه سبد خرید
              </h2>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between gap-2">
                  <span className="text-[#a8bad8]">جمع کل کالاها</span>
                  <span className="font-semibold text-white tabular-nums">
                    {formatStoreMoney(pricing.subtotal, pricing.currency)}
                  </span>
                </p>
                <p className="flex justify-between gap-2 border-t border-white/10 pt-3 text-base font-black text-white">
                  <span>مبلغ قابل پرداخت</span>
                  <span className="tabular-nums">
                    {formatStoreMoney(pricing.total, pricing.currency)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#121622] px-3 py-2 text-[11px] text-[#a8bad8]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#38bdf8]" />
                <span>کد تخفیف و قیمت نهایی در مرحله تسویه‌حساب در سرور بررسی می‌شوند.</span>
              </div>

              <form action={goToCheckout} className="space-y-2.5 pt-1">
                <button
                  type="submit"
                  disabled={staleCount > 0}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#e10600]/25 transition hover:bg-[#c80500] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>ادامه تسویه‌حساب</span>
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <Link
                  href="/shop"
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/85 transition hover:border-white/30 hover:text-white"
                >
                  <Store className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>ادامه خرید و افزودن محصول دیگر</span>
                </Link>
              </form>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}