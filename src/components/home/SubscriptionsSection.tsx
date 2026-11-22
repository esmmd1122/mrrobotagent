'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  ShoppingBag,
} from 'lucide-react'
import { useCart } from '@/components/cart/CartProvider'
import {
  resolveArtifactKey,
  type ArtifactKey,
} from '@/components/cinema/engine/ProductShowcase3D'
import {
  resolveProductDisplayPricing,
  resolveProductMonogram,
  resolveShowcaseAccentHex,
} from '@/components/cinema/engine/product-showcase-helpers'
import type { ShowcaseProductItem } from '@/components/cinema/ProductShowcaseCanvas'
import type { StorefrontProduct } from '@/lib/mappers/product'
import {
  computeActiveCarouselIndex,
  computeCarouselNavBounds,
  computeCarouselStep,
  resolveCarouselScrollDelta,
  type CarouselDirection,
} from './carousel-helpers'
import {
  getDefaultPlan,
  toFaDigits,
  type HomeCategoryItem,
} from './product-helpers'

const ProductShowcaseCanvas = dynamic(
  () =>
    import('@/components/cinema/ProductShowcaseCanvas').then(
      (m) => m.ProductShowcaseCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[340px] w-full items-center justify-center rounded-2xl border border-white/10 bg-[#070b15] lg:min-h-[410px]">
        <span className="text-xs text-[#8da3c8]">در حال آماده‌سازی نمای سه‌بعدی...</span>
      </div>
    ),
  },
)

type Props = {
  products: StorefrontProduct[]
  categories: HomeCategoryItem[]
  title?: string
  description?: string
  imageUrl?: string
  imageAlt?: string
  selectedProductSlug?: string | null
  reducedMotion?: boolean
  onSelectArtifact: (key: ArtifactKey) => void
  onDragArtifact: (deltaX: number) => void
  onOpenRequest: (subject: string) => void
}

function ProductMediaFallback({
  product,
  compact = false,
}: {
  product: StorefrontProduct
  compact?: boolean
}) {
  const accent = resolveShowcaseAccentHex(product.slug, product.categorySlug)
  const monogram = resolveProductMonogram(product.nameEn, product.name)

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0a0f1c] px-4 text-center"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 35%, ${accent}26 0%, rgba(10, 15, 28, 0.96) 70%)`,
      }}
    >
      <div
        className={`flex items-center justify-center rounded-2xl border bg-[#0d1323] font-black text-white shadow-lg ${
          compact ? 'h-12 w-12 text-base' : 'h-16 w-16 text-xl'
        }`}
        style={{ borderColor: `${accent}66` }}
        dir="ltr"
      >
        {monogram}
      </div>
      <p
        className={`mt-2.5 max-w-full truncate font-bold text-white/90 ${
          compact ? 'text-xs' : 'text-sm'
        }`}
        dir="ltr"
      >
        {product.nameEn || product.name}
      </p>
      <span
        className="mt-2 h-0.5 w-10 rounded-full"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
    </div>
  )
}

export function SubscriptionsSection({
  products,
  categories,
  title,
  description,
  imageUrl,
  imageAlt,
  selectedProductSlug,
  reducedMotion = false,
  onSelectArtifact,
  onOpenRequest,
}: Props) {
  const { addItem, isLoading } = useCart()
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeSlug, setActiveSlug] = useState<string>(products[0]?.slug ?? '')
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({})
  const [justAddedName, setJustAddedName] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [navBounds, setNavBounds] = useState({ canPrev: false, canNext: false })
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)

  const showcaseAnchorRef = useRef<HTMLDivElement | null>(null)
  const carouselTrackRef = useRef<HTMLDivElement | null>(null)

  // Mount interactive 3D product showcase strictly on desktop (>= 768px)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 768px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products
    return products.filter((p) => p.categorySlug === activeCategory)
  }, [products, activeCategory])

  const activeProduct = useMemo(() => {
    return (
      filteredProducts.find((p) => p.slug === activeSlug) ??
      filteredProducts[0] ??
      products[0] ??
      null
    )
  }, [filteredProducts, activeSlug, products])

  const syncCarouselMetrics = useCallback(() => {
    const track = carouselTrackRef.current
    if (!track) return
    const firstCard = track.querySelector<HTMLElement>('[data-carousel-card="true"]')
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : null
    const step = computeCarouselStep(track.clientWidth, cardWidth, 14)

    setNavBounds(
      computeCarouselNavBounds(track.scrollLeft, track.scrollWidth, track.clientWidth),
    )
    setActiveSlideIndex(
      computeActiveCarouselIndex(
        track.scrollLeft,
        track.scrollWidth,
        track.clientWidth,
        step,
        filteredProducts.length,
      ),
    )
  }, [filteredProducts.length])

  useEffect(() => {
    syncCarouselMetrics()
    if (typeof window === 'undefined') return
    window.addEventListener('resize', syncCarouselMetrics, { passive: true })
    return () => window.removeEventListener('resize', syncCarouselMetrics)
  }, [syncCarouselMetrics, activeCategory, isDesktop])

  // Scroll card into view when externally selected (e.g., from Services section)
  useEffect(() => {
    if (selectedProductSlug && products.some((p) => p.slug === selectedProductSlug)) {
      setActiveCategory('all')
      setActiveSlug(selectedProductSlug)
      requestAnimationFrame(() => {
        const track = carouselTrackRef.current
        const card = track?.querySelector<HTMLElement>(
          `[data-testid="marketplace-card-${selectedProductSlug}"]`,
        )
        card?.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'start',
        })
      })
    }
  }, [selectedProductSlug, products, reducedMotion])

  // Keep parent scene bridge informed when active product changes
  useEffect(() => {
    if (!activeProduct) return
    const key = resolveArtifactKey(
      activeProduct.slug,
      activeProduct.categorySlug,
      activeProduct.nameEn,
    )
    onSelectArtifact(key)
  }, [activeProduct, onSelectArtifact])

  const getSelectedPlanForProduct = useCallback(
    (product: StorefrontProduct) => {
      if (!product.plansEnabled) return null
      const chosenId = selectedPlans[product.id]
      if (chosenId) {
        const match = product.activePlans.find((pl) => pl.id === chosenId && pl.isActive)
        if (match) return match
      }
      return getDefaultPlan(product)
    },
    [selectedPlans],
  )

  const activePlan = useMemo(
    () => (activeProduct ? getSelectedPlanForProduct(activeProduct) : null),
    [activeProduct, getSelectedPlanForProduct],
  )

  const activePricing = useMemo(() => {
    return activeProduct ? resolveProductDisplayPricing(activeProduct, activePlan) : null
  }, [activeProduct, activePlan])

  const activeHighlights = useMemo(() => {
    if (!activeProduct) return []
    return [...activeProduct.features, ...activeProduct.details]
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3)
  }, [activeProduct])

  const showcaseItem: ShowcaseProductItem | null = useMemo(() => {
    if (!activeProduct || !activePricing) return null
    return {
      id: activeProduct.id,
      slug: activeProduct.slug,
      name: activeProduct.name,
      nameEn: activeProduct.nameEn,
      categorySlug: activeProduct.categorySlug,
      categoryNameFa: activeProduct.categoryNameFa,
      imageUrl:
        activeProduct.imageUrl && !failedImages[activeProduct.imageUrl]
          ? activeProduct.imageUrl
          : null,
      priceLabel: activePricing.formattedFinal,
    }
  }, [activeProduct, activePricing, failedImages])

  const customTitle = title?.trim()
  const customDesc = description?.trim()

  const activeBuyHref =
    activeProduct && activePricing
      ? `/subscriptions/${activeProduct.slug}/buy${
          activePricing.planId
            ? `?planId=${encodeURIComponent(activePricing.planId)}`
            : ''
        }`
      : '/shop'

  async function handleAddProductToCart(
    product: StorefrontProduct,
    planId: string | null,
    planTitle: string | null,
  ) {
    const label = planTitle ? `${product.name} — ${planTitle}` : product.name
    const res = await addItem(product.id, 1, planId, { label })
    if (res.ok) {
      setJustAddedName(label)
    }
  }

  function handleSelectProduct(product: StorefrontProduct, scrollToStage = false) {
    setActiveSlug(product.slug)
    setJustAddedName(null)
    if (scrollToStage && isDesktop && showcaseAnchorRef.current) {
      const rect = showcaseAnchorRef.current.getBoundingClientRect()
      if (rect.top < 96 || rect.top > window.innerHeight * 0.72) {
        showcaseAnchorRef.current.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      }
    }
  }

  function scrollCarousel(direction: CarouselDirection) {
    const track = carouselTrackRef.current
    if (!track) return
    const firstCard = track.querySelector<HTMLElement>('[data-carousel-card="true"]')
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : null
    const step = computeCarouselStep(track.clientWidth, cardWidth, 14)
    const isRtl = getComputedStyle(track).direction === 'rtl'
    const delta = resolveCarouselScrollDelta(direction, step, isRtl)
    track.scrollBy({
      left: delta,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  function scrollCarouselToIndex(index: number) {
    const track = carouselTrackRef.current
    if (!track) return
    const cards = track.querySelectorAll<HTMLElement>('[data-carousel-card="true"]')
    const target = cards[index]
    if (!target) return
    target.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'start',
    })
  }

  function handleCarouselKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const track = carouselTrackRef.current
    if (!track) return
    const isRtl = getComputedStyle(track).direction === 'rtl'
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      scrollCarousel(isRtl ? 'next' : 'prev')
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      scrollCarousel(isRtl ? 'prev' : 'next')
    }
  }

  function markImageFailed(url: string) {
    setFailedImages((prev) => (prev[url] ? prev : { ...prev, [url]: true }))
  }

  return (
    <section
      className="cinema-story-scene cinema-marketplace-scene"
      id="marketplace"
      data-scene="3"
    >
      {/* Preserve legacy #subscriptions anchor compatibility */}
      <span id="subscriptions" className="sr-only" aria-hidden="true" />

      <div className="cinema-container">
        {/* Section Header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
          <div className="max-w-2xl">
            <p className="mb-1 text-xs font-semibold text-[#ff5a56]">
              فروشگاه رسمی اشتراک‌ها و سرویس‌های دیجیتال MR.ROBOT
            </p>
            {customTitle ? (
              <h2 className="cinema-section-heading !mb-0">{customTitle}</h2>
            ) : (
              <h2 className="cinema-section-heading !mb-0">
                محصول مورد نظر را انتخاب کنید و{' '}
                <span className="cinema-title-accent">مستقیم سفارش دهید</span>
              </h2>
            )}
            <p className="mt-2 text-xs leading-relaxed text-[#a8bad8] sm:mt-2.5 sm:text-sm">
              {customDesc ||
                'محصولات را به‌صورت افقی مرور کنید، پلن و قیمت نهایی را ببینید و فوری سفارش خود را ثبت نمایید.'}
            </p>
          </div>
          <Link
            href="/shop"
            className="cinema-btn cinema-btn-subtle cinema-btn-sm min-h-[44px] shrink-0"
          >
            <span>مشاهده کامل فروشگاه</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {imageUrl?.trim() ? (
          <div className="mb-5 overflow-hidden rounded-2xl border border-white/12 bg-black/50 sm:mb-6">
            <div className="aspect-[16/4] w-full overflow-hidden">
              <img
                src={imageUrl}
                alt={imageAlt || customTitle || 'فروشگاه محصولات MR.ROBOT'}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        ) : null}

        {products.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#080d1a]/90 p-8 text-center">
            <p className="text-base font-semibold text-white">
              محصولات فروشگاه در حال به‌روزرسانی هستند.
            </p>
            <p className="mt-2 text-sm text-[#a8bad8]">
              برای ثبت سفارش مستقیم یا مشاوره خرید با کارشناسان MR.ROBOT در ارتباط باشید.
            </p>
            <div className="cinema-cta-group mt-5 justify-center">
              <button
                type="button"
                onClick={() => onOpenRequest('استعلام و خرید سرویس دیجیتال')}
                className="cinema-btn cinema-btn-signature"
              >
                ثبت درخواست خرید
              </button>
              <Link href="/shop" className="cinema-btn cinema-btn-subtle">
                صفحه فروشگاه
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Featured 3D Product Showcase + Immediate Purchase Module */}
            {isDesktop && activeProduct && activePricing && showcaseItem ? (
              <div
                ref={showcaseAnchorRef}
                data-testid="marketplace-featured-stage"
                className="mb-7 hidden scroll-mt-28 rounded-2xl border border-white/10 bg-[#080c17]/95 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.52)] md:block lg:p-6"
              >
                <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-7">
                  {/* Interactive 3D Product Showcase */}
                  <div className="min-w-0">
                    <ProductShowcaseCanvas
                      product={showcaseItem}
                      reducedMotion={reducedMotion}
                    />
                  </div>

                  {/* Buyer Info & Immediate Purchase Panel */}
                  <div className="flex min-w-0 flex-col justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8da3c8]">
                        <span>
                          {activeProduct.categoryNameFa || 'اشتراک دیجیتال'} ·{' '}
                          <span
                            className={
                              activeProduct.isAvailable
                                ? 'font-semibold text-emerald-300'
                                : 'text-white/50'
                            }
                          >
                            {activeProduct.isAvailable
                              ? 'موجود و آماده تحویل'
                              : 'ناموجود'}
                          </span>
                        </span>
                        {activeProduct.nameEn &&
                        activeProduct.nameEn.trim().toLowerCase() !==
                          activeProduct.name.trim().toLowerCase() ? (
                          <span
                            className="font-mono text-[11px] text-white/45"
                            dir="ltr"
                          >
                            {activeProduct.nameEn}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-2.5 text-xl font-black leading-snug text-white sm:text-2xl">
                        {activeProduct.name}
                      </h3>

                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#a8bad8]">
                        {activeProduct.description}
                      </p>

                      <div className="mt-4 flex flex-wrap items-baseline gap-3 border-y border-white/10 py-3.5">
                        <span className="text-2xl font-black text-white tabular-nums">
                          {activePricing.formattedFinal}
                        </span>
                        {activePricing.formattedOriginal &&
                        activePricing.discountPercent !== null ? (
                          <>
                            <span className="text-sm text-white/45 line-through tabular-nums">
                              {activePricing.formattedOriginal}
                            </span>
                            <span className="rounded-md bg-[#e10600]/20 px-2 py-0.5 text-xs font-bold text-[#ff6b68] tabular-nums">
                              {toFaDigits(activePricing.discountPercent)}٪ تخفیف
                            </span>
                          </>
                        ) : null}
                      </div>

                      {activeProduct.plansEnabled &&
                      activeProduct.activePlans.length > 0 ? (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-semibold text-[#9cb2d6]">
                            انتخاب پلن و مدت اشتراک:
                          </p>
                          <div
                            className="flex flex-wrap gap-2"
                            aria-label="انتخاب پلن اشتراک"
                          >
                            {activeProduct.activePlans
                              .filter((pl) => pl.isActive)
                              .map((plan) => {
                                const isCurrent = activePlan?.id === plan.id
                                return (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPlans((prev) => ({
                                        ...prev,
                                        [activeProduct.id]: plan.id,
                                      }))
                                      setJustAddedName(null)
                                    }}
                                    className={`min-h-[38px] rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                                      isCurrent
                                        ? 'border-[#e10600] bg-[#e10600]/20 text-white'
                                        : 'border-white/12 bg-[#0e1526] text-[#a8bad8] hover:border-white/30 hover:text-white'
                                    }`}
                                  >
                                    {plan.title}
                                  </button>
                                )
                              })}
                          </div>
                        </div>
                      ) : null}

                      {activeHighlights.length > 0 ? (
                        <ul className="mt-4 space-y-2 text-xs text-[#c5d4ec]">
                          {activeHighlights.map((item, idx) => (
                            <li
                              key={`${activeProduct.id}-hl-${idx}`}
                              className="flex items-start gap-2"
                            >
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ff4d48]" />
                              <span className="line-clamp-1">{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col gap-2.5 sm:flex-row">
                        {activePricing.purchasable ? (
                          <>
                            <Link
                              href={activeBuyHref}
                              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#e10600] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#c50500]"
                            >
                              <span>خرید فوری</span>
                              <ArrowUpLeft className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() =>
                                void handleAddProductToCart(
                                  activeProduct,
                                  activePricing.planId,
                                  activePricing.planTitle,
                                )
                              }
                              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/18 bg-[#12192b] px-4 py-2.5 text-sm font-bold text-white transition hover:border-[#e10600]/70 hover:bg-[#192238] disabled:opacity-60"
                            >
                              <ShoppingBag className="h-4 w-4 text-[#ff4d48]" />
                              <span>افزودن به سبد خرید</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenRequest(`استعلام قیمت: ${activeProduct.name}`)
                            }
                            className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#e10600] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#c50500]"
                          >
                            ثبت درخواست و استعلام قیمت
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <Link
                          href={`/subscriptions/${activeProduct.slug}`}
                          className="inline-flex items-center gap-1.5 font-semibold text-[#93c5fd] transition hover:text-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>مشاهده جزئیات کامل، راهنمای فعال‌سازی و پلن‌ها</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Compact Horizontally Scrollable Category Chips + Carousel Controls */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div
                className="cinema-filter-bar !mb-0"
                role="tablist"
                aria-label="فیلتر دسته‌بندی محصولات"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === 'all'}
                  className={`cinema-filter-btn ${activeCategory === 'all' ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveCategory('all')
                    setActiveSlideIndex(0)
                    carouselTrackRef.current?.scrollTo({ left: 0, behavior: 'auto' })
                  }}
                >
                  همه ({toFaDigits(products.length)})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === cat.slug}
                    className={`cinema-filter-btn ${
                      activeCategory === cat.slug ? 'is-active' : ''
                    }`}
                    onClick={() => {
                      setActiveCategory(cat.slug)
                      setJustAddedName(null)
                      setActiveSlideIndex(0)
                      carouselTrackRef.current?.scrollTo({ left: 0, behavior: 'auto' })
                      const first = products.find((p) => p.categorySlug === cat.slug)
                      if (first) setActiveSlug(first.slug)
                    }}
                  >
                    {cat.nameFa}
                  </button>
                ))}
              </div>

              {/* Carousel Position & Prev/Next Arrow Controls */}
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <p className="text-xs text-[#8da3c8]">
                  <span className="font-bold text-white tabular-nums">
                    {toFaDigits(Math.min(activeSlideIndex + 1, Math.max(1, filteredProducts.length)))}
                  </span>{' '}
                  از{' '}
                  <span className="tabular-nums">
                    {toFaDigits(filteredProducts.length)}
                  </span>{' '}
                  محصول
                </p>

                <div className="flex items-center gap-2" aria-label="کنترل پیمایش محصولات">
                  <button
                    type="button"
                    data-testid="carousel-prev-btn"
                    onClick={() => scrollCarousel('prev')}
                    disabled={!navBounds.canPrev}
                    aria-label="محصول قبلی"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-[#0c1324] text-white transition hover:border-[#e10600]/70 hover:bg-[#141f38] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    data-testid="carousel-next-btn"
                    onClick={() => scrollCarousel('next')}
                    disabled={!navBounds.canNext}
                    aria-label="محصول بعدی"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-[#0c1324] text-white transition hover:border-[#e10600]/70 hover:bg-[#141f38] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cart Added Feedback Banner (Visible on both Mobile & Desktop) */}
            {justAddedName ? (
              <div
                role="status"
                className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/12 px-3.5 py-2.5 text-xs text-emerald-100"
              >
                <span>«{justAddedName}» به سبد خرید اضافه شد.</span>
                <div className="flex items-center gap-2">
                  <Link
                    href="/cart"
                    className="inline-flex min-h-[36px] items-center rounded-lg border border-emerald-400/40 px-2.5 py-1 font-semibold text-emerald-200 hover:bg-emerald-500/20"
                  >
                    سبد خرید
                  </Link>
                  <Link
                    href="/checkout"
                    className="inline-flex min-h-[36px] items-center rounded-lg bg-[#e10600] px-2.5 py-1 font-bold text-white hover:bg-[#c80500]"
                  >
                    تسویه‌حساب
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Horizontal Swipeable Product Carousel (Mobile: 1 Main Card + Next Peek | Desktop: Multi-Card Row) */}
            <div
              role="region"
              aria-roledescription="carousel"
              aria-label="فهرست افقی محصولات MR.ROBOT"
              tabIndex={0}
              onKeyDown={handleCarouselKeyDown}
              className="mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e10600]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040917]"
            >
              <div
                ref={carouselTrackRef}
                dir="rtl"
                data-testid="marketplace-product-carousel"
                onScroll={syncCarouselMetrics}
                className="cinema-carousel-track flex items-stretch gap-3.5 pb-2 md:gap-4"
              >
                {filteredProducts.map((product) => {
                  const isSelected = activeProduct?.id === product.id
                  const cardPlan = getSelectedPlanForProduct(product)
                  const pricing = resolveProductDisplayPricing(product, cardPlan)
                  const hasUsableImage = Boolean(
                    product.imageUrl && !failedImages[product.imageUrl],
                  )
                  const buyHref = `/subscriptions/${product.slug}/buy${
                    pricing.planId
                      ? `?planId=${encodeURIComponent(pricing.planId)}`
                      : ''
                  }`

                  return (
                    <article
                      key={product.id}
                      data-carousel-card="true"
                      data-testid={`marketplace-card-${product.slug}`}
                      data-selected={isSelected ? 'true' : 'false'}
                      className={`group flex w-[83%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-[#090e1b]/95 transition duration-200 sm:w-[62%] md:w-[46%] lg:w-[31.8%] xl:w-[24%] ${
                        isSelected && isDesktop
                          ? 'border-[#e10600]/80 shadow-[0_14px_38px_rgba(225,6,0,0.16)]'
                          : 'border-white/12 hover:border-white/25'
                      }`}
                    >
                      {/* Product Image Header */}
                      <button
                        type="button"
                        onClick={() => handleSelectProduct(product, true)}
                        className="relative block aspect-[16/10] w-full overflow-hidden border-b border-white/8 bg-[#060a14] text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e10600]"
                        aria-label={`انتخاب و مشاهده ${product.name}`}
                      >
                        {hasUsableImage ? (
                          <img
                            src={product.imageUrl!}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            referrerPolicy="no-referrer"
                            onError={() => markImageFailed(product.imageUrl!)}
                          />
                        ) : (
                          <ProductMediaFallback product={product} compact />
                        )}

                        {pricing.discountPercent !== null ? (
                          <span className="absolute left-2.5 top-2.5 rounded-md bg-[#e10600] px-2 py-0.5 text-[11px] font-extrabold text-white tabular-nums">
                            {toFaDigits(pricing.discountPercent)}٪ تخفیف
                          </span>
                        ) : null}
                      </button>

                      {/* Card Details & Direct Actions */}
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#8da3c8]">
                          <span className="truncate">
                            {product.categoryNameFa || 'سرویس دیجیتال'}
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 font-semibold ${
                              product.isAvailable ? 'text-emerald-300' : 'text-zinc-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                product.isAvailable ? 'bg-emerald-400' : 'bg-zinc-500'
                              }`}
                              aria-hidden="true"
                            />
                            {product.isAvailable ? 'موجود' : 'ناموجود'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectProduct(product, true)}
                          className="mt-1.5 text-right focus:outline-none"
                        >
                          <h3 className="line-clamp-1 text-base font-extrabold text-white transition group-hover:text-[#ff6b68]">
                            {product.name}
                          </h3>
                        </button>

                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#9cb2d6]">
                          {product.description}
                        </p>

                        {/* Compact Real Plan Selector on Card (if plans are configured in DB) */}
                        {product.plansEnabled && product.activePlans.length > 0 ? (
                          <div
                            className="mt-3 flex flex-wrap gap-1.5"
                            aria-label={`انتخاب پلن ${product.name}`}
                          >
                            {product.activePlans
                              .filter((pl) => pl.isActive)
                              .slice(0, 3)
                              .map((plan) => {
                                const isCurrent = cardPlan?.id === plan.id
                                return (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPlans((prev) => ({
                                        ...prev,
                                        [product.id]: plan.id,
                                      }))
                                      setActiveSlug(product.slug)
                                      setJustAddedName(null)
                                    }}
                                    className={`min-h-[32px] rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                                      isCurrent
                                        ? 'border-[#e10600] bg-[#e10600]/20 text-white'
                                        : 'border-white/12 bg-[#0e1526] text-[#a8bad8] hover:border-white/30 hover:text-white'
                                    }`}
                                  >
                                    {plan.title}
                                  </button>
                                )
                              })}
                          </div>
                        ) : null}

                        {/* Aligned Price Baseline */}
                        <div className="mt-auto pt-4">
                          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-white/8 pt-3">
                            <span className="text-base font-black text-white tabular-nums">
                              {pricing.formattedFinal}
                            </span>
                            {pricing.formattedOriginal &&
                            pricing.discountPercent !== null ? (
                              <span className="text-[11px] text-white/45 line-through tabular-nums">
                                {pricing.formattedOriginal}
                              </span>
                            ) : null}
                          </div>

                          {/* Clear Purchase Button + Cart + Details Link */}
                          <div className="mt-3 flex items-center gap-2">
                            {pricing.purchasable ? (
                              <>
                                <Link
                                  href={buyHref}
                                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#e10600] px-3 text-xs font-extrabold text-white transition hover:bg-[#c50500]"
                                >
                                  خرید فوری
                                </Link>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() =>
                                    void handleAddProductToCart(
                                      product,
                                      pricing.planId,
                                      pricing.planTitle,
                                    )
                                  }
                                  aria-label={`افزودن ${product.name} به سبد خرید`}
                                  title="افزودن به سبد خرید"
                                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl border border-white/15 bg-[#111829] px-3 text-xs font-semibold text-white transition hover:border-[#e10600]/70 hover:bg-[#19233b] disabled:opacity-60"
                                >
                                  <ShoppingBag className="h-4 w-4 text-[#ff4d48]" />
                                  <span className="sr-only sm:not-sr-only">سبد</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenRequest(`استعلام قیمت: ${product.name}`)
                                }
                                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#e10600] px-3 text-xs font-extrabold text-white transition hover:bg-[#c50500]"
                              >
                                استعلام قیمت
                              </button>
                            )}
                            <Link
                              href={`/subscriptions/${product.slug}`}
                              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/12 px-3 text-xs font-semibold text-[#c5d4ec] transition hover:border-white/30 hover:text-white"
                            >
                              جزئیات
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              {/* Compact Pagination Dots for Quick Swipe Orientation */}
              {filteredProducts.length > 1 ? (
                <div
                  className="mt-3 flex items-center justify-center gap-1.5"
                  aria-label="نشانگر موقعیت اسلایدر محصولات"
                >
                  {filteredProducts.map((product, idx) => {
                    const isCurrent = idx === activeSlideIndex
                    return (
                      <button
                        key={`dot-${product.id}`}
                        type="button"
                        onClick={() => scrollCarouselToIndex(idx)}
                        aria-label={`نمایش محصول ${toFaDigits(idx + 1)}: ${product.name}`}
                        aria-current={isCurrent ? 'true' : undefined}
                        className="flex h-7 items-center justify-center px-0.5"
                      >
                        <span
                          className={`block h-1.5 rounded-full transition-all ${
                            isCurrent
                              ? 'w-6 bg-[#e10600]'
                              : 'w-2 bg-white/25 hover:bg-white/45'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>

            {/* Concise Buyer Trust Strip (Swipeable Row on Mobile, 3-Col Grid on Desktop) */}
            <div className="cinema-carousel-track mt-5 flex gap-3 sm:mt-6 sm:grid sm:grid-cols-3 sm:overflow-visible">
              <div className="w-[82%] shrink-0 snap-start rounded-2xl border border-white/10 bg-[#080d18]/90 p-4 text-xs text-[#a8bad8] sm:w-auto sm:p-5">
                <p className="font-bold text-white">۱. قیمت و تخفیف شفاف در سرور</p>
                <p className="mt-1 leading-relaxed">
                  مبلغ نهایی پیش از پرداخت به‌صورت دقیق محاسبه و نمایش داده می‌شود.
                </p>
              </div>
              <div className="w-[82%] shrink-0 snap-start rounded-2xl border border-white/10 bg-[#080d18]/90 p-4 text-xs text-[#a8bad8] sm:w-auto sm:p-5">
                <p className="font-bold text-white">۲. پیگیری مستقیم سفارش و تحویل</p>
                <p className="mt-1 leading-relaxed">
                  پس از خرید، کد پیگیری اختصاصی دریافت می‌کنید و از{' '}
                  <Link
                    href="/orders/track"
                    className="text-white underline decoration-white/35 hover:text-[#ff4d48]"
                  >
                    صفحه پیگیری سفارش
                  </Link>{' '}
                  وضعیت را لحظه‌ای می‌بینید.
                </p>
              </div>
              <div className="w-[82%] shrink-0 snap-start rounded-2xl border border-white/10 bg-[#080d18]/90 p-4 text-xs text-[#a8bad8] sm:w-auto sm:p-5">
                <p className="font-bold text-white">۳. پشتیبانی واقعی پیش و پس از خرید</p>
                <p className="mt-1 leading-relaxed">
                  برای راهنمای فعال‌سازی یا انتخاب سرویس، از{' '}
                  <Link
                    href="/contact"
                    className="text-white underline decoration-white/35 hover:text-[#ff4d48]"
                  >
                    تماس با پشتیبانی
                  </Link>{' '}
                  با تیم MR.ROBOT در ارتباط باشید.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
