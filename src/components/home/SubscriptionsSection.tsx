'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, MoveHorizontal, ShoppingBag } from 'lucide-react'
import { useCart } from '@/components/cart/CartProvider'
import {
  resolveArtifactKey,
  type ArtifactKey,
} from '@/components/cinema/engine/ProductShowcase3D'
import type { StorefrontProduct } from '@/lib/mappers/product'
import {
  formatProductPriceLabel,
  getDefaultPlan,
  type HomeCategoryItem,
} from './product-helpers'

type Props = {
  products: StorefrontProduct[]
  categories: HomeCategoryItem[]
  title?: string
  description?: string
  imageUrl?: string
  imageAlt?: string
  selectedProductSlug?: string | null
  onSelectArtifact: (key: ArtifactKey) => void
  onDragArtifact: (deltaX: number) => void
  onOpenRequest: (subject: string) => void
}

export function SubscriptionsSection({
  products,
  categories,
  title,
  description,
  imageUrl,
  imageAlt,
  selectedProductSlug,
  onSelectArtifact,
  onDragArtifact,
  onOpenRequest,
}: Props) {
  const { addItem, isLoading } = useCart()
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeSlug, setActiveSlug] = useState<string>(products[0]?.slug ?? '')
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({})

  const [justAddedName, setJustAddedName] = useState<string | null>(null)
  const draggingRef = useRef(false)
  const lastXRef = useRef(0)

  useEffect(() => {
    if (selectedProductSlug && products.some((p) => p.slug === selectedProductSlug)) {
      setActiveCategory('all')
      setActiveSlug(selectedProductSlug)
    }
  }, [selectedProductSlug, products])

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

  // Sync Three.js 3D Product Showcase sculpture whenever active product changes
  useEffect(() => {
    if (!activeProduct) return
    const key = resolveArtifactKey(
      activeProduct.slug,
      activeProduct.categorySlug,
      activeProduct.nameEn,
    )
    onSelectArtifact(key)
  }, [activeProduct, onSelectArtifact])

  const activePlan = useMemo(() => {
    if (!activeProduct || !activeProduct.plansEnabled) return null
    const chosenId = selectedPlans[activeProduct.id]
    if (chosenId) {
      const match = activeProduct.activePlans.find((pl) => pl.id === chosenId && pl.isActive)
      if (match) return match
    }
    return getDefaultPlan(activeProduct)
  }, [activeProduct, selectedPlans])

  const activePriceInfo = activeProduct
    ? formatProductPriceLabel(activeProduct, activePlan)
    : null

  const activeSpecs = useMemo(() => {
    if (!activeProduct) return []
    const combined = [...activeProduct.features, ...activeProduct.details].filter(Boolean)
    return combined.slice(0, 4)
  }, [activeProduct])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return
    draggingRef.current = true
    lastXRef.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const dx = e.clientX - lastXRef.current
    lastXRef.current = e.clientX
    onDragArtifact(dx)
  }

  const handlePointerUp = () => {
    draggingRef.current = false
  }

  const customTitle = title?.trim()
  const customDesc = description?.trim()

  const activeBuyHref =
    activeProduct && activePriceInfo
      ? `/subscriptions/${activeProduct.slug}/buy${
          activePriceInfo.planId
            ? `?planId=${encodeURIComponent(activePriceInfo.planId)}`
            : ''
        }`
      : '/shop'

  async function handleAddActiveToCart() {
    if (!activeProduct || !activePriceInfo) return
    const label = activePlan
      ? `${activeProduct.name} — ${activePlan.title}`
      : activeProduct.name
    const res = await addItem(activeProduct.id, 1, activePriceInfo.planId, { label })
    if (res.ok) {
      setJustAddedName(label)
    }
  }

  return (
    <section
      className="cinema-story-scene"
      id="marketplace"
      data-scene="3"
    >
      {/* Preserve legacy #subscriptions anchor compatibility */}
      <span id="subscriptions" className="sr-only" aria-hidden="true" />

      <div className="cinema-container">
        <div className="mb-7">
          <p className="mb-2 text-xs font-semibold text-[#ff5a56]">
            فروشگاه رسمی اشتراک‌ها و سرویس‌های دیجیتال MR.ROBOT
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            {customTitle ? (
              <h2 className="cinema-section-heading !mb-0">{customTitle}</h2>
            ) : (
              <h2 className="cinema-section-heading !mb-0">
                محصول را انتخاب کنید و{' '}
                <span className="cinema-title-accent">سریع و مطمئن سفارش دهید</span>
              </h2>
            )}
            <Link href="/shop" className="cinema-btn cinema-btn-subtle cinema-btn-sm">
              <span>مشاهده همه محصولات</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          {customDesc ? (
            <p className="cinema-lead-text mt-3">{customDesc}</p>
          ) : (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#a8bad8]">
              هر سرویس را از فهرست زیر انتخاب کنید، مشخصات و تعرفه شفاف آن را ببینید و مستقیم وارد مرحله خرید شوید یا به سبد خرید اضافه کنید.
            </p>
          )}
          {imageUrl?.trim() ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-white/15 bg-black/40">
              <div className="aspect-[16/5] w-full overflow-hidden">
                <img
                  src={imageUrl}
                  alt={imageAlt || customTitle || 'فروشگاه محصولات MR.ROBOT'}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          ) : null}
        </div>

        {products.length === 0 ? (
          <div className="cinema-navy-card p-8 text-center">
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
            <div className="cinema-market-grid">
              {/* Right (RTL first column): Real Filterable Catalog from Prisma */}
              <div>
                <div className="cinema-filter-bar" role="tablist" aria-label="فیلتر دسته‌بندی محصولات">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === 'all'}
                    className={`cinema-filter-btn ${activeCategory === 'all' ? 'is-active' : ''}`}
                    onClick={() => setActiveCategory('all')}
                  >
                    همه محصولات
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
                        const first = products.find((p) => p.categorySlug === cat.slug)
                        if (first) setActiveSlug(first.slug)
                      }}
                    >
                      {cat.nameFa}
                    </button>
                  ))}
                </div>

                <div className="cinema-catalog-list">
                  {filteredProducts.map((product) => {
                    const isSelected = activeProduct?.id === product.id
                    const priceInfo = formatProductPriceLabel(product)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setActiveSlug(product.slug)
                          setJustAddedName(null)
                        }}
                        className={`cinema-catalog-item ${isSelected ? 'is-selected' : ''}`}
                      >
                        {product.imageUrl ? (
                          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-black">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1 text-right">
                          <h4 className="truncate text-sm font-bold text-white">{product.name}</h4>
                          <p className="mt-0.5 line-clamp-1 text-xs text-[#9cb2d6]">
                            {product.description}
                          </p>
                        </div>
                        <span
                          className={`cinema-price-chip shrink-0 tabular-nums ${
                            priceInfo.isPromo ? 'is-promo' : ''
                          }`}
                        >
                          {priceInfo.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Left (RTL second column): Live 3D Inspection Window + Buyer Action Card */}
              {activeProduct && activePriceInfo ? (
                <div
                  className="cinema-stage-frame"
                  title="برای چرخش سه‌بعدی بکشید"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <div className="cinema-stage-bar">
                    <span className="cinema-drag-pill">
                      <MoveHorizontal className="h-3.5 w-3.5 text-[#38bdf8]" />
                      <span>برای چرخش سه‌بعدی بکشید</span>
                    </span>
                    <span className="text-xs font-medium text-[#a8bad8]">
                      {activeProduct.categoryNameFa || 'سرویس دیجیتال'} ·{' '}
                      <span className={activeProduct.isAvailable ? 'text-emerald-300' : 'text-white/50'}>
                        {activeProduct.isAvailable ? 'آماده سفارش' : 'ناموجود'}
                      </span>
                    </span>
                  </div>

                  {/* Transparent window frames the live 3D ProductShowcase3D sculpture */}
                  <div className="min-h-[160px] sm:min-h-[200px]" aria-hidden="true" />

                  <div className="cinema-stage-panel">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {activeProduct.imageUrl ? (
                          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black">
                            <img
                              src={activeProduct.imageUrl}
                              alt={activeProduct.name}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1 text-lg font-extrabold text-white">
                            {activeProduct.name}
                          </h3>
                          <p className="text-sm leading-relaxed text-[#a8bad8]">
                            {activeProduct.description}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`cinema-price-chip shrink-0 text-sm font-black tabular-nums ${
                          activePriceInfo.isPromo ? 'is-promo' : ''
                        }`}
                      >
                        {activePriceInfo.label}
                      </span>
                    </div>

                    {/* Real Multi-Plan Selector when Product has plansEnabled */}
                    {activeProduct.plansEnabled && activeProduct.activePlans.length > 0 ? (
                      <div className="cinema-plan-pills" aria-label="انتخاب پلن اشتراک">
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
                                className={`cinema-plan-pill ${isCurrent ? 'is-active' : ''}`}
                              >
                                {plan.title}
                              </button>
                            )
                          })}
                      </div>
                    ) : null}

                    {activeSpecs.length > 0 ? (
                      <div className="cinema-spec-list">
                        {activeSpecs.map((spec, idx) => (
                          <span key={`${activeProduct.id}-spec-${idx}`} className="cinema-spec-tag">
                            {spec}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* Clear Hierarchy: 1. Buy Now (Primary) -> 2. Add to Cart (Secondary) -> 3. View Details */}
                    <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                      {activePriceInfo.purchasable ? (
                        <>
                          <Link
                            href={activeBuyHref}
                            className="cinema-btn cinema-btn-signature min-h-[46px] flex-1"
                          >
                            خرید فوری و ثبت سفارش
                          </Link>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => void handleAddActiveToCart()}
                            className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#e10600]/60 bg-[#151824] px-4 py-2.5 text-sm font-bold text-white transition hover:border-[#e10600] hover:bg-[#e10600]/15 disabled:opacity-60"
                          >
                            <ShoppingBag className="h-4 w-4 text-[#ff4d48]" />
                            <span>افزودن به سبد خرید</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenRequest(`استعلام قیمت: ${activeProduct.name}`)}
                          className="cinema-btn cinema-btn-signature min-h-[46px] flex-1"
                        >
                          ثبت درخواست و استعلام قیمت
                        </button>
                      )}

                      <Link
                        href={`/subscriptions/${activeProduct.slug}`}
                        className="cinema-btn cinema-btn-subtle cinema-btn-sm min-h-[44px] w-full sm:w-auto"
                      >
                        مشاهده جزئیات کامل
                      </Link>
                    </div>

                    {justAddedName ? (
                      <div
                        role="status"
                        className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/12 px-3.5 py-2.5 text-xs text-emerald-100"
                      >
                        <span>«{justAddedName}» به سبد خرید اضافه شد.</span>
                        <div className="flex items-center gap-2">
                          <Link
                            href="/cart"
                            className="rounded-lg border border-emerald-400/40 px-2.5 py-1 font-semibold text-emerald-200 hover:bg-emerald-500/20"
                          >
                            سبد خرید
                          </Link>
                          <Link
                            href="/checkout"
                            className="rounded-lg bg-[#e10600] px-2.5 py-1 font-bold text-white hover:bg-[#c80500]"
                          >
                            تسویه‌حساب
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Concise Real Buyer Trust Strip */}
            <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-[#0d1018]/90 p-4 text-xs text-[#a8bad8] sm:grid-cols-3 sm:p-5">
              <div>
                <p className="font-bold text-white">۱. قیمت و تخفیف واقعی در سرور</p>
                <p className="mt-1 leading-relaxed">
                  مبلغ نهایی پیش از ثبت سفارش شفاف نمایش داده می‌شود و بدون هزینه‌های پنهان محاسبه می‌گردد.
                </p>
              </div>
              <div>
                <p className="font-bold text-white">۲. پیگیری شفاف سفارش و تحویل</p>
                <p className="mt-1 leading-relaxed">
                  کد پیگیری اختصاصی صادر می‌شود و وضعیت سفارش در{' '}
                  <Link href="/orders/track" className="text-white underline decoration-white/35 hover:text-[#ff4d48]">
                    صفحه پیگیری
                  </Link>{' '}
                  و حساب کاربری قابل مشاهده است.
                </p>
              </div>
              <div>
                <p className="font-bold text-white">۳. پشتیبانی مستقیم پیش و پس از خرید</p>
                <p className="mt-1 leading-relaxed">
                  برای مشاوره انتخاب سرویس یا راهنمای فعال‌سازی، مستقیم از صفحه{' '}
                  <Link href="/contact" className="text-white underline decoration-white/35 hover:text-[#ff4d48]">
                    تماس با ما
                  </Link>{' '}
                  در ارتباط باشید.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
