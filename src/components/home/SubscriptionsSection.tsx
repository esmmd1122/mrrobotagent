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
  selectedProductSlug?: string | null
  onSelectArtifact: (key: ArtifactKey) => void
  onDragArtifact: (deltaX: number) => void
  onOpenRequest: (subject: string) => void
}

export function SubscriptionsSection({
  products,
  categories,
  selectedProductSlug,
  onSelectArtifact,
  onDragArtifact,
  onOpenRequest,
}: Props) {
  const { addItem, isLoading } = useCart()
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeSlug, setActiveSlug] = useState<string>(products[0]?.slug ?? '')
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({})

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

  const holoCode = activeProduct
    ? `HOLO // ${activeProduct.slug.toUpperCase().slice(0, 14)}`
    : 'HOLO // CATALOG'

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
          <div className="cinema-kicker">
            <span className="dot" />
            <span>فروشگاه تعاملی سه‌بعدی</span>
            <span className="code">SCENE 04</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="cinema-section-heading !mb-0">
              محصول را سه‌بعدی بررسی کنید و{' '}
              <span className="cinema-title-accent">آسان سفارش دهید</span>
            </h2>
            <Link href="/shop" className="cinema-btn cinema-btn-subtle cinema-btn-sm">
              <span>مشاهده همه محصولات</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
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
                className="cinema-btn cinema-btn-buy"
              >
                ثبت درخواست خرید
              </button>
              <Link href="/shop" className="cinema-btn cinema-btn-subtle">
                صفحه فروشگاه
              </Link>
            </div>
          </div>
        ) : (
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
                      onClick={() => setActiveSlug(product.slug)}
                      className={`cinema-catalog-item ${isSelected ? 'is-selected' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate">{product.name}</h4>
                        <p className="line-clamp-1">{product.description}</p>
                      </div>
                      <span
                        className={`cinema-price-chip shrink-0 ${
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

            {/* Left (RTL second column): Live 3D Hologram Inspection Window */}
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
                    <span>برای چرخش سه‌بعدی به چپ یا راست بکشید</span>
                  </span>
                  <span className="mono-code">{holoCode}</span>
                </div>

                {/* Transparent window frames the live 3D ProductShowcase3D sculpture */}
                <div className="min-h-[190px] sm:min-h-[220px]" aria-hidden="true" />

                <div className="cinema-stage-panel">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 text-lg font-extrabold text-white">
                        {activeProduct.name}
                      </h3>
                      <p className="text-sm leading-relaxed text-[#a8bad8]">
                        {activeProduct.description}
                      </p>
                    </div>
                    <span
                      className={`cinema-price-chip shrink-0 ${
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
                              onClick={() =>
                                setSelectedPlans((prev) => ({
                                  ...prev,
                                  [activeProduct.id]: plan.id,
                                }))
                              }
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

                  <div className="cinema-cta-group mt-3">
                    {activePriceInfo.purchasable ? (
                      <>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() =>
                            void addItem(activeProduct.id, 1, activePriceInfo.planId, {
                              label: activePlan
                                ? `${activeProduct.name} — ${activePlan.title}`
                                : activeProduct.name,
                            })
                          }
                          className="cinema-btn cinema-btn-buy flex-1"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          <span>افزودن به سبد سفارش</span>
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() =>
                            void addItem(activeProduct.id, 1, activePriceInfo.planId, {
                              label: activePlan
                                ? `${activeProduct.name} — ${activePlan.title}`
                                : activeProduct.name,
                              openAfterAdd: true,
                            })
                          }
                          className="cinema-btn cinema-btn-signature"
                        >
                          ثبت سریع سفارش
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenRequest(`استعلام قیمت: ${activeProduct.name}`)}
                        className="cinema-btn cinema-btn-buy flex-1"
                      >
                        ثبت درخواست و استعلام قیمت
                      </button>
                    )}

                    <Link
                      href={`/subscriptions/${activeProduct.slug}`}
                      className="cinema-btn cinema-btn-subtle cinema-btn-sm"
                    >
                      جزئیات کامل
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
