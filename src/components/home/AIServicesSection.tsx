'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MessageSquareCode, ShoppingBag } from 'lucide-react'
import { useCart } from '@/components/cart/CartProvider'
import { aiServices } from '@/data/aiServices'
import type { StorefrontProduct } from '@/lib/mappers/product'
import { formatStoreMoney } from '@/modules/commerce/money'
import {
  findMatchingProduct,
  formatProductPriceLabel,
  type HomeAIOffering,
} from './product-helpers'

type Props = {
  offerings: HomeAIOffering[]
  products: StorefrontProduct[]
  title?: string
  description?: string
  imageUrl?: string
  imageAlt?: string
  onPulseEyes: () => void
  onOpenRequest: (subject: string) => void
  onOpenAssistant?: () => void
}

type ResolvedIntent = {
  id: string
  tabLabel: string
  title: string
  description: string
  useCase: string
  priceLabel: string
  matchedProduct?: StorefrontProduct
}

export function AIServicesSection({
  offerings,
  products,
  title,
  description,
  imageUrl,
  imageAlt,
  onPulseEyes,
  onOpenRequest,
  onOpenAssistant,
}: Props) {
  const { addItem, isLoading } = useCart()

  const intents = useMemo<ResolvedIntent[]>(() => {
    const aiCatalogProduct = findMatchingProduct(
      products,
      /chatgpt|openai|gemini|claude|cursor|copilot|ai|gpt/,
    )

    if (offerings.length > 0) {
      return offerings.slice(0, 5).map((item) => {
        const directMatch = findMatchingProduct(
          products,
          new RegExp(item.slug.replace(/[^a-z0-9]/gi, '|') || 'ai', 'i'),
        )
        return {
          id: item.id,
          tabLabel: item.titleFa,
          title: item.titleFa,
          description: item.description,
          useCase: item.useCase,
          priceLabel:
            item.price && item.price > 0
              ? formatStoreMoney(item.price)
              : 'مشاوره و برآورد اختصاصی',
          matchedProduct: directMatch ?? aiCatalogProduct,
        }
      })
    }

    return aiServices.slice(0, 4).map((svc) => ({
      id: svc.id,
      tabLabel: svc.title,
      title: svc.title,
      description: svc.description,
      useCase: svc.useCase,
      priceLabel: aiCatalogProduct
        ? formatProductPriceLabel(aiCatalogProduct).label
        : 'مشاوره و برآورد اختصاصی',
      matchedProduct: aiCatalogProduct,
    }))
  }, [offerings, products])

  const [activeId, setActiveId] = useState<string>(intents[0]?.id ?? '')
  const active = intents.find((i) => i.id === activeId) ?? intents[0]
  const matchedPrice = active?.matchedProduct
    ? formatProductPriceLabel(active.matchedProduct)
    : null
  const customTitle = title?.trim()
  const customDesc = description?.trim()

  return (
    <section
      className="cinema-story-scene"
      id="ai-experience"
      data-scene="4"
    >
      {/* Preserve legacy #ai anchor compatibility */}
      <span id="ai" className="sr-only" aria-hidden="true" />

      <div className="cinema-container">
        <div className="cinema-ai-split">
          <div>
            <div className="cinema-kicker">
              <span className="dot" />
              <span>تجربه فناوری هوش مصنوعی</span>
              <span className="code">SCENE 05</span>
            </div>

            {customTitle ? (
              <h2 className="cinema-section-heading">{customTitle}</h2>
            ) : (
              <h2 className="cinema-section-heading">
                ابزار هوشمند مناسب{' '}
                <span className="cinema-title-accent">مسیر کاری خود را انتخاب کنید</span>
              </h2>
            )}

            <p className="cinema-lead-text">
              {customDesc || (
                <>
                  حوزه فعالیت یا نیاز هوشمند خود را مشخص کنید تا{' '}
                  <span className="cinema-brand-inline">MR.ROBOT</span> راهکار دقیق اتوماسیون یا
                  اشتراک هوش مصنوعی متناسب با کار شما را آماده کند.
                </>
              )}
            </p>

            {imageUrl?.trim() ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-white/15 bg-black/40">
                <div className="aspect-[16/7] w-full overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={imageAlt || customTitle || 'خدمات هوش مصنوعی MR.ROBOT'}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            ) : null}

            {active ? (
              <div className="cinema-neural-console">
                <div className="text-xs font-semibold text-[#38bdf8]">
                  حوزه اصلی استفاده یا سرویس هوشمند مورد نظر شما چیست؟
                </div>

                <div className="cinema-intent-tabs" role="tablist" aria-label="انتخاب راهکار هوش مصنوعی">
                  {intents.map((item) => {
                    const isCurrent = item.id === active.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={isCurrent}
                        className={`cinema-intent-btn ${isCurrent ? 'is-active' : ''}`}
                        onClick={() => {
                          setActiveId(item.id)
                          onPulseEyes()
                        }}
                      >
                        {item.tabLabel}
                      </button>
                    )
                  })}
                </div>

                <div className="cinema-ai-result-box">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-lg font-extrabold text-white">
                      {active.title}
                    </strong>
                    <span className="cinema-price-chip">{active.priceLabel}</span>
                  </div>

                  <p className="text-sm leading-relaxed text-[#a8bad8]">
                    {active.description}
                  </p>

                  <div className="cinema-ai-features">
                    <div className="cinema-ai-feature-pill">{active.useCase}</div>
                    <div className="cinema-ai-feature-pill">
                      طراحی و پیاده‌سازی مطابق نیاز واقعی شما
                    </div>
                    <div className="cinema-ai-feature-pill">
                      پشتیبانی فنی و راهنمای راه‌اندازی کامل
                    </div>
                    <div className="cinema-ai-feature-pill">
                      امکان ثبت درخواست اختصاصی و تیمی
                    </div>
                  </div>

                  <div className="cinema-cta-group">
                    {active.matchedProduct && matchedPrice?.purchasable ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() =>
                          void addItem(
                            active.matchedProduct!.id,
                            1,
                            matchedPrice.planId,
                            {
                              label: active.matchedProduct!.name,
                              openAfterAdd: true,
                            },
                          )
                        }
                        className="cinema-btn cinema-btn-buy"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        <span>افزودن اشتراک مرتبط به سفارش</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onOpenRequest(`درخواست: ${active.title}`)}
                      className="cinema-btn cinema-btn-signature"
                    >
                      ثبت درخواست پیاده‌سازی AI
                    </button>

                    {onOpenAssistant ? (
                      <button
                        type="button"
                        onClick={onOpenAssistant}
                        data-ai-chat-trigger="true"
                        className="cinema-btn cinema-btn-subtle"
                      >
                        <MessageSquareCode className="h-4 w-4 text-[#ef1d42]" />
                        <span>گفتگو با MR.ROBOT AI</span>
                      </button>
                    ) : (
                      <Link href="/chat" className="cinema-btn cinema-btn-subtle">
                        <MessageSquareCode className="h-4 w-4 text-[#38bdf8]" />
                        <span>گفتگو در صفحه AI</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Left space frames MR.ROBOT in Neural Conductor stance on desktop */}
          <div className="cinema-stage-spacer" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
