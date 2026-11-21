'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Search,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react'
import { formatStoreMoney } from '@/modules/commerce/money'
import { filterShopCategories } from '@/modules/commerce/storefront-presenters'
import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { ProductLogo } from '@/components/ui/ProductLogo'

export type ShopCatalogProductItem = {
  id: string
  slug: string
  nameFa: string
  nameEn: string | null
  description: string
  imageUrl: string | null
  currency: string
  isAvailable: boolean
  isFeatured: boolean
  plansEnabled: boolean
  activePlanCount: number
  defaultPlanId: string | null
  unitPrice: number | null
  listPrice: number | null
  isFromPrice: boolean
  purchasable: boolean
  discountPct: number | null
  previewFeatures: string[]
  directBuyHref: string
}

export type ShopCatalogCategoryGroup = {
  id: string
  slug: string
  nameFa: string
  nameEn: string | null
  products: ShopCatalogProductItem[]
}

type Props = {
  categories: ShopCatalogCategoryGroup[]
}

export function ShopCatalogClient({ categories }: Props) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [onlyPurchasable, setOnlyPurchasable] = useState(false)

  const totalProducts = useMemo(
    () => categories.reduce((sum, c) => sum + c.products.length, 0),
    [categories],
  )

  const purchasableCount = useMemo(
    () =>
      categories.reduce(
        (sum, c) => sum + c.products.filter((p) => p.purchasable).length,
        0,
      ),
    [categories],
  )

  const filteredCategories = useMemo(
    () =>
      filterShopCategories(categories, {
        query,
        categorySlug: selectedCategory,
        onlyPurchasable,
      }),
    [categories, query, selectedCategory, onlyPurchasable],
  )

  const matchedCount = useMemo(
    () => filteredCategories.reduce((sum, c) => sum + c.products.length, 0),
    [filteredCategories],
  )

  const hasActiveFilters = Boolean(query.trim()) || selectedCategory !== 'all' || onlyPurchasable

  const unifiedFlatProducts = useMemo(
    () =>
      filteredCategories.flatMap((cat) =>
        cat.products.map((product) => ({ product, categoryNameFa: cat.nameFa })),
      ),
    [filteredCategories],
  )

  const useUnifiedGrid = selectedCategory === 'all'

  function renderProductCard(p: ShopCatalogProductItem, categoryNameFa: string) {
    const hasMultiplePlans = p.plansEnabled && p.activePlanCount > 1

    return (
      <li
        key={p.id}
        className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1018] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e10600]/45 hover:shadow-[0_14px_34px_rgba(0,0,0,0.45)]"
      >
        {/* Clean 16:10 Product Visual Frame */}
        <Link
          href={`/subscriptions/${p.slug}`}
          className="relative block aspect-[16/10] w-full overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#12182b] via-[#090c14] to-[#1a0a0d]"
        >
          {p.imageUrl ? (
            <img
              src={p.imageUrl}
              alt={p.nameFa}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
              <div className="scale-125 transition-transform duration-300 group-hover:scale-[1.32]">
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

          {p.discountPct ? (
            <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-[#e10600] px-2.5 py-1 text-xs font-extrabold text-white shadow-md">
              {p.discountPct.toLocaleString('fa-IR')}٪ تخفیف
            </span>
          ) : null}
        </Link>

        {/* Card Body */}
        <div className="flex flex-1 flex-col p-5">
          {/* Clean unboxed metadata row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#92a6c7]">
            <span>{categoryNameFa}</span>
            <span aria-hidden="true">·</span>
            <span className={p.isAvailable ? 'text-emerald-300' : 'text-white/50'}>
              {p.isAvailable ? 'موجود' : 'ناموجود'}
            </span>
            {p.isFeatured ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#ff5a56]">پیشنهادی</span>
              </>
            ) : null}
          </div>

          <Link href={`/subscriptions/${p.slug}`} className="mt-2 block">
            <h3 className="break-words text-lg font-extrabold leading-snug text-white transition-colors group-hover:text-[#ff4d48]">
              {p.nameFa}
            </h3>
          </Link>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#a8bad8]">
            {p.description}
          </p>

          {p.previewFeatures.length > 0 ? (
            <ul className="mt-3.5 space-y-1.5 text-xs text-white/80">
              {p.previewFeatures.map((feat, idx) => (
                <li key={`${p.id}-f-${idx}`} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e10600]" />
                  <span className="line-clamp-1">{feat}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Prominent Price Block */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-xl font-black text-white tabular-nums">
                  {p.unitPrice != null
                    ? `${p.isFromPrice ? 'از ' : ''}${formatStoreMoney(
                        p.unitPrice,
                        p.currency,
                      )}`
                    : 'استعلام قیمت'}
                </p>
                {p.listPrice != null ? (
                  <span className="text-xs text-white/45 line-through tabular-nums">
                    {formatStoreMoney(p.listPrice, p.currency)}
                  </span>
                ) : null}
              </div>

              {hasMultiplePlans ? (
                <span className="text-xs font-medium text-[#38bdf8]">
                  {p.activePlanCount.toLocaleString('fa-IR')} طرح فعال
                </span>
              ) : null}
            </div>
          </div>

          {/* Clear 3-Level Purchase Hierarchy (zero duplicate buttons) */}
          <div className="mt-auto space-y-2.5 pt-4">
            {p.purchasable ? (
              <>
                {/* Primary Action: Buy Now */}
                <Link
                  href={p.directBuyHref}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-[#e10600]/25 transition hover:bg-[#c80500]"
                >
                  <Zap className="h-4 w-4" />
                  <span>
                    {hasMultiplePlans ? 'انتخاب طرح و خرید' : 'خرید فوری'}
                  </span>
                </Link>

                {/* Secondary Action: Add to Cart (single-plan) OR View Details (multi-plan) */}
                {!hasMultiplePlans ? (
                  <div className="grid grid-cols-2 gap-2">
                    <AddToCartButton
                      productId={p.id}
                      planId={p.defaultPlanId}
                      productLabel={p.nameFa}
                      label="افزودن به سبد"
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#e10600]/55 bg-[#151824] px-3 py-2 text-xs font-bold text-white transition hover:border-[#e10600] hover:bg-[#e10600]/15 disabled:opacity-60"
                    />
                    <Link
                      href={`/subscriptions/${p.slug}`}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
                    >
                      <span>مشاهده جزئیات</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/subscriptions/${p.slug}`}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
                  >
                    <span>مشاهده جزئیات و مقایسه طرح‌ها</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Link>
                )}
              </>
            ) : (
              <div className="grid gap-2">
                <Link
                  href={`/contact?subject=${encodeURIComponent(`استعلام و خرید ${p.nameFa}`)}`}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#e10600]/60 bg-[#e10600]/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#e10600]/25"
                >
                  <span>استعلام قیمت و ثبت درخواست</span>
                </Link>
                <Link
                  href={`/subscriptions/${p.slug}`}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/25 hover:text-white"
                >
                  <span>مشاهده جزئیات محصول</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </li>
    )
  }

  return (
    <div className="mt-5">
      {/* Search + Category Filter Toolbar */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1018] p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 lg:max-w-md">
            <Search
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی محصول یا اشتراک (مثلاً ChatGPT، CapCut...)"
              aria-label="جستجوی محصول در فروشگاه"
              className="min-h-[44px] w-full rounded-xl border border-white/12 bg-[#121622] pr-10 pl-9 text-sm text-white placeholder:text-white/40 transition focus:border-[#e10600]/65 focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="پاک کردن جستجو"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* Right Controls: Ready-to-Buy Filter + Result Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            {purchasableCount > 0 && purchasableCount < totalProducts ? (
              <button
                type="button"
                onClick={() => setOnlyPurchasable((v) => !v)}
                aria-pressed={onlyPurchasable}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition whitespace-nowrap ${
                  onlyPurchasable
                    ? 'border-[#e10600]/65 bg-[#e10600]/15 text-white'
                    : 'border-white/12 bg-[#121622] text-white/75 hover:border-white/25 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#ff4d48]" />
                <span>فقط آماده خرید آنلاین</span>
              </button>
            ) : null}

            <p className="text-xs text-[#a8bad8] tabular-nums">
              نمایش{' '}
              <strong className="text-white">{matchedCount.toLocaleString('fa-IR')}</strong> از{' '}
              {totalProducts.toLocaleString('fa-IR')} محصول
            </p>
          </div>
        </div>

        {/* Category Filter Tabs */}
        {categories.length > 1 ? (
          <div
            role="tablist"
            aria-label="فیلتر دسته‌بندی‌های فروشگاه"
            className="mt-3 flex gap-2 overflow-x-auto pb-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
              className={`min-h-[38px] shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedCategory === 'all'
                  ? 'border-[#e10600] bg-[#e10600] text-white shadow-sm shadow-[#e10600]/25'
                  : 'border-white/12 bg-[#121622] text-white/75 hover:border-white/25 hover:text-white'
              }`}
            >
              همه محصولات ({totalProducts.toLocaleString('fa-IR')})
            </button>

            {categories.map((cat) => {
              const active = selectedCategory === cat.slug
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`min-h-[38px] shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-[#e10600] bg-[#e10600] text-white shadow-sm shadow-[#e10600]/25'
                      : 'border-white/12 bg-[#121622] text-white/75 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {cat.nameFa} ({cat.products.length.toLocaleString('fa-IR')})
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* Filtered Results */}
      {filteredCategories.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0d1018] p-10 text-center">
          <p className="text-base font-bold text-white">
            محصولی مطابق با فیلتر یا عبارت جستجوی شما پیدا نشد.
          </p>
          <p className="mt-2 text-sm text-[#a8bad8]">
            عبارت جستجو را تغییر دهید یا همه دسته‌بندی‌ها را نمایش دهید.
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSelectedCategory('all')
                setOnlyPurchasable(false)
              }}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#e10600] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#c80500]"
            >
              نمایش همه محصولات
            </button>
          ) : null}
        </div>
      ) : useUnifiedGrid ? (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {unifiedFlatProducts.map(({ product, categoryNameFa }) =>
            renderProductCard(product, categoryNameFa),
          )}
        </ul>
      ) : (
        <div className="mt-7 space-y-10">
          {filteredCategories.map((cat) => (
            <section key={cat.id} id={cat.slug} className="scroll-mt-28">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <h2 className="text-xl font-extrabold text-white sm:text-2xl">
                    {cat.nameFa}
                  </h2>
                  {cat.nameEn ? (
                    <span className="text-xs text-white/45" dir="ltr">
                      {cat.nameEn}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-white/50 tabular-nums">
                  {cat.products.length.toLocaleString('fa-IR')} محصول
                </span>
              </div>

              <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {cat.products.map((p) => renderProductCard(p, cat.nameFa))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
