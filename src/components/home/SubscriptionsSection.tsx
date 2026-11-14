'use client'

import { motion } from 'framer-motion'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { Button } from '@/components/ui/Button'
import type { StorefrontProduct } from '@/lib/mappers/product'
import { effectiveUnitPrice } from '@/modules/commerce/unit-price'
import { formatStoreMoney } from '@/modules/commerce/money'
import { isProductPurchasable } from '@/modules/commerce/product-pricing'

export function SubscriptionsSection({
  products,
  title,
  description,
}: {
  products: StorefrontProduct[]
  title?: string
  description?: string
}) {
  return (
    <section id="subscriptions" className="relative border-t border-mr-border py-20 sm:py-28">
      <div className="absolute inset-0 -z-10 bg-mr-charcoal/30" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="اشتراک"
          title={title || 'خرید اشتراک‌های دیجیتال'}
          description={
            description ||
            'دسترسی به ابزارهای حرفه‌ای دنیای دیجیتال، با خدمات اختصاصی MR.ROBOT'
          }
        />

        {products.length === 0 ? (
          <p className="mt-10 text-center text-sm text-mr-muted">
            محصولی در فروشگاه فعال نیست. از پنل ادمین یا seed پایگاه داده را پر کنید.
          </p>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product, index) => (
              <motion.article
                key={product.slug}
                className="card-shop group flex flex-col p-6 transition duration-300 hover:-translate-y-1 hover:border-mr-red/30 hover:shadow-[0_20px_40px_-20px_rgba(225,6,0,0.35)]"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
              >
                <div className="flex items-start gap-4">
                  <ProductLogo slug={product.slug as 'chatgpt-plus' | 'capcut-pro' | 'grok' | 'gemini-pro'} />
                  <div>
                    <h3 className="font-bold text-white" dir="ltr">
                      {product.nameEn}
                    </h3>
                    <p className="mt-1 text-sm text-mr-muted">{product.description}</p>
                  </div>
                </div>

                <ul className="mt-5 flex-1 space-y-2 text-sm text-white/80">
                  {product.details.map((d) => (
                    <li key={d} className="flex gap-2">
                      <span className="text-mr-red">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 border-t border-mr-border pt-4">
                  <p className="text-xs text-mr-muted">قیمت</p>
                  <p className="mt-1 text-lg font-semibold text-white/90">
                    {(() => {
                      if (product.plansEnabled && product.activePlans.length > 0) {
                        const from = Math.min(
                          ...product.activePlans
                            .map((pl) => effectiveUnitPrice(pl.price, pl.promoPrice))
                            .filter((u): u is number => u != null),
                        )
                        return Number.isFinite(from) ? `از ${formatStoreMoney(from)}` : 'تماس بگیرید'
                      }
                      const unit = effectiveUnitPrice(product.price, product.promoPrice)
                      return unit != null ? formatStoreMoney(unit) : 'تماس بگیرید'
                    })()}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <Button
                    href={`/subscriptions/${product.slug}`}
                    variant="outline"
                    className="w-full !py-2.5 text-sm"
                  >
                    جزئیات اشتراک
                  </Button>
                  {isProductPurchasable({
                    price: product.price ?? null,
                    promoPrice: product.promoPrice ?? null,
                    isAvailable: true,
                    isVisible: true,
                    plansEnabled: product.plansEnabled,
                    activePlans: product.activePlans,
                  }) ? (
                    <Button
                      href={`/subscriptions/${product.slug}`}
                      variant="primary"
                      className="w-full !py-2.5 text-sm"
                    >
                      خرید اشتراک
                    </Button>
                  ) : (
                    <Button
                      href={`/contact?subject=${encodeURIComponent(`خرید ${product.name}`)}`}
                      variant="secondary"
                      className="w-full !py-2.5 text-sm"
                    >
                      تماس برای خرید
                    </Button>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-mr-muted">
          پرداخت آنلاین از درگاه پیکربندی‌شده (یا حالت آزمایشی در توسعه) انجام می‌شود.
        </p>
      </div>
    </section>
  )
}
