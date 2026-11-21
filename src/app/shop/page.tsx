import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Eye,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { getProductCategories } from '@/lib/catalog'
import { formatStoreMoney } from '@/modules/commerce/pricing'
import { resolveProductDisplayPrice } from '@/modules/commerce/display-price'
import { calculateDiscountPercent } from '@/lib/site-config/cms-helpers'
import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { ProductLogo } from '@/components/ui/ProductLogo'

function parseFeaturePreview(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 2)
    }
  } catch {
    return []
  }
  return []
}

export default async function ShopPage() {
  const categories = await getProductCategories()
  const nonEmptyCategories = categories.filter((c) => c.products.length > 0)
  const totalProducts = nonEmptyCategories.reduce((sum, c) => sum + c.products.length, 0)

  return (
    <div className="section-glow pt-28 pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Storefront Header */}
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.28em] text-[#e10600]">
              MR.ROBOT STORE
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              فروشگاه خدمات و اشتراک‌های دیجیتال
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#a8bad8] sm:text-base">
              تمامی تعرفه‌ها، تخفیف‌ها و طرح‌های اشتراک به‌صورت دقیق در سرور محاسبه می‌شوند. محصول مورد نظر خود را بررسی کنید، به سبد خرید اضافه کنید یا مستقیم وارد مرحله تسویه‌حساب شوید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#a8bad8]">
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0d111c] px-3.5 py-2">
              <Layers className="h-4 w-4 text-[#38bdf8]" />
              <span>{totalProducts.toLocaleString('fa-IR')} محصول فعال</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0d111c] px-3.5 py-2">
              <ShieldCheck className="h-4 w-4 text-[#e10600]" />
              <span>محاسبه امن قیمت در سرور</span>
            </div>
          </div>
        </header>

        {/* Quick Category Jump Bar */}
        {nonEmptyCategories.length > 1 ? (
          <nav
            aria-label="دسته‌بندی‌های فروشگاه"
            className="mt-6 flex flex-wrap items-center gap-2"
          >
            {nonEmptyCategories.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.slug}`}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-white/12 bg-[#0d111c] px-3.5 py-1.5 text-xs font-semibold text-white/80 transition hover:border-[#e10600]/60 hover:bg-[#e10600]/10 hover:text-white"
              >
                <span>{cat.nameFa}</span>
                <span className="text-[11px] text-white/45">
                  ({cat.products.length.toLocaleString('fa-IR')})
                </span>
              </a>
            ))}
          </nav>
        ) : null}

        {nonEmptyCategories.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-white/10 bg-[#0d111c] p-10 text-center">
            <p className="text-base font-bold text-white">
              در حال حاضر محصول فعالی برای نمایش وجود ندارد.
            </p>
            <p className="mt-2 text-sm text-[#a8bad8]">
              برای استعلام یا ثبت سفارش اختصاصی می‌توانید با پشتیبانی در ارتباط باشید.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#e10600] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#c80500]"
            >
              <span>تماس با پشتیبانی</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-12 space-y-16">
            {nonEmptyCategories.map((cat) => (
              <section key={cat.id} id={cat.slug} className="scroll-mt-28">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-white sm:text-2xl">
                      {cat.nameFa}
                    </h2>
                    {cat.nameEn ? (
                      <p className="mt-0.5 text-xs tracking-wider text-white/45" dir="ltr">
                        {cat.nameEn}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs text-white/50">
                    {cat.products.length.toLocaleString('fa-IR')} محصول
                  </span>
                </div>

                <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.products.map((p) => {
                    const priceInfo = resolveProductDisplayPrice({
                      price: p.price,
                      promoPrice: p.promoPrice,
                      isAvailable: p.isAvailable,
                      isVisible: p.isVisible,
                      plansEnabled: p.plansEnabled,
                      plans: p.plans,
                    })
                    const hasMultiplePlans = p.plansEnabled && priceInfo.activePlanCount > 1
                    const directBuyHref = hasMultiplePlans
                      ? `/subscriptions/${p.slug}#buy`
                      : `/subscriptions/${p.slug}/buy${
                          priceInfo.defaultPlanId
                            ? `?planId=${encodeURIComponent(priceInfo.defaultPlanId)}`
                            : ''
                        }`
                    const discountPct = calculateDiscountPercent(
                      priceInfo.listPrice,
                      priceInfo.unitPrice,
                    )
                    const previewFeatures = parseFeaturePreview(p.featuresJson)

                    return (
                      <li
                        key={p.id}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1018] shadow-lg transition duration-200 hover:border-[#e10600]/45 hover:shadow-[#e10600]/10"
                      >
                        {/* Consistent 16:10 Product Visual Frame */}
                        <Link
                          href={`/subscriptions/${p.slug}`}
                          className="relative block aspect-[16/10] w-full overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#111728] via-[#090c14] to-[#1a0a0d]"
                        >
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.nameFa}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 p-5">
                              <div className="scale-110 transition duration-300 group-hover:scale-125">
                                <ProductLogo
                                  slug={
                                    p.slug as
                                      | 'chatgpt-plus'
                                      | 'capcut-pro'
                                      | 'grok'
                                      | 'gemini-pro'
                                  }
                                />
                              </div>
                              <span
                                className="max-w-full truncate text-xs font-semibold tracking-wider text-white/45"
                                dir="ltr"
                              >
                                {p.nameEn || p.slug}
                              </span>
                            </div>
                          )}

                          {/* Top Status & Discount Badges */}
                          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[11px] font-bold backdrop-blur-md ${
                                  p.isAvailable
                                    ? 'border-emerald-500/40 bg-black/65 text-emerald-300'
                                    : 'border-white/20 bg-black/75 text-white/60'
                                }`}
                              >
                                {p.isAvailable ? 'موجود' : 'ناموجود'}
                              </span>
                              {p.isFeatured ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-[#e10600]/50 bg-[#e10600]/85 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-md">
                                  <Sparkles className="h-3 w-3" />
                                  <span>پیشنهادی</span>
                                </span>
                              ) : null}
                            </div>

                            {discountPct ? (
                              <span className="rounded-md bg-[#e10600] px-2 py-0.5 text-[11px] font-black text-white shadow">
                                {discountPct.toLocaleString('fa-IR')}٪ تخفیف
                              </span>
                            ) : null}
                          </div>
                        </Link>

                        {/* Product Body */}
                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/subscriptions/${p.slug}`}
                              className="min-w-0 flex-1"
                            >
                              <h3 className="break-words text-base font-extrabold text-white transition group-hover:text-[#ff4d48]">
                                {p.nameFa}
                              </h3>
                              {p.nameEn ? (
                                <p
                                  className="mt-0.5 truncate text-[11px] text-white/45"
                                  dir="ltr"
                                >
                                  {p.nameEn}
                                </p>
                              ) : null}
                            </Link>
                          </div>

                          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-[#a8bad8]">
                            {p.description}
                          </p>

                          {previewFeatures.length > 0 ? (
                            <ul className="mt-3 space-y-1.5 text-xs text-white/75">
                              {previewFeatures.map((feat, idx) => (
                                <li key={`${p.id}-f-${idx}`} className="flex items-start gap-1.5">
                                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e10600]" />
                                  <span className="line-clamp-1">{feat}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          {/* Pricing Block */}
                          <div className="mt-4 border-t border-white/10 pt-4">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <p className="text-lg font-black text-white tabular-nums">
                                  {priceInfo.unitPrice != null
                                    ? `${priceInfo.isFromPrice ? 'از ' : ''}${formatStoreMoney(
                                        priceInfo.unitPrice,
                                        p.currency,
                                      )}`
                                    : 'استعلام قیمت'}
                                </p>
                                {priceInfo.listPrice != null ? (
                                  <span className="text-xs text-white/45 line-through tabular-nums">
                                    {formatStoreMoney(priceInfo.listPrice, p.currency)}
                                  </span>
                                ) : null}
                              </div>

                              {hasMultiplePlans ? (
                                <span className="text-[11px] font-semibold text-[#38bdf8]">
                                  {priceInfo.activePlanCount.toLocaleString('fa-IR')} طرح فعال
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Visually Distinct Brand-Aligned Action Buttons */}
                          <div className="mt-auto space-y-2 pt-4">
                            {priceInfo.purchasable ? (
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Link
                                  href={directBuyHref}
                                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#e10600] px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-[#e10600]/25 transition hover:bg-[#c80500]"
                                >
                                  <Zap className="h-3.5 w-3.5" />
                                  <span>{hasMultiplePlans ? 'انتخاب طرح و خرید' : 'خرید فوری'}</span>
                                </Link>

                                {!hasMultiplePlans ? (
                                  <AddToCartButton
                                    productId={p.id}
                                    planId={priceInfo.defaultPlanId}
                                    productLabel={p.nameFa}
                                    label="افزودن به سبد"
                                    className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#e10600]/50 bg-[#151824] px-3 py-2 text-xs font-bold text-white transition hover:border-[#e10600] hover:bg-[#e10600]/15 disabled:opacity-60"
                                  />
                                ) : (
                                  <Link
                                    href={`/subscriptions/${p.slug}`}
                                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#e10600]/50 bg-[#151824] px-3 py-2 text-xs font-bold text-white transition hover:border-[#e10600] hover:bg-[#e10600]/15"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-[#ff4d48]" />
                                    <span>مقایسه طرح‌ها</span>
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <Link
                                href={`/contact?subject=${encodeURIComponent(`خرید ${p.nameFa}`)}`}
                                className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#e10600]/50 bg-[#e10600]/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-[#e10600]/20"
                              >
                                تماس برای استعلام و خرید
                              </Link>
                            )}

                            <Link
                              href={`/subscriptions/${p.slug}`}
                              className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-white/75 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
                            >
                              <span>مشاهده جزئیات کامل</span>
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}