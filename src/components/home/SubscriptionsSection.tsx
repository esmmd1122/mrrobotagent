'use client'

import { motion } from 'framer-motion'
import { subscriptionProducts } from '@/data/products'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { Button } from '@/components/ui/Button'

export function SubscriptionsSection() {
  return (
    <section id="subscriptions" className="relative border-t border-mr-border py-20 sm:py-28">
      <div className="absolute inset-0 -z-10 bg-mr-charcoal/30" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="اشتراک"
          title="خرید اشتراک‌های دیجیتال"
          description="دسترسی به ابزارهای حرفه‌ای دنیای دیجیتال، با خدمات اختصاصی MR.ROBOT"
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {subscriptionProducts.map((product, index) => (
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
                <p className="text-xs text-mr-muted">قیمت (قابل تنظیم در پنل)</p>
                <p className="mt-1 text-lg font-semibold text-white/90">—</p>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <Button
                  href={`/subscriptions/${product.slug}`}
                  variant="outline"
                  className="w-full !py-2.5 text-sm"
                >
                  جزئیات اشتراک
                </Button>
                <Button
                  href={`/contact?subject=${encodeURIComponent(`خرید ${product.name}`)}`}
                  variant="secondary"
                  className="w-full !py-2.5 text-sm"
                >
                  درخواست خرید
                </Button>
              </div>
            </motion.article>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-mr-muted">
          قیمت و موجودی پس از تأیید تیم MR.ROBOT اعلام می‌شود؛ پرداخت آنلاین به‌زودی فعال می‌شود.
        </p>
      </div>
    </section>
  )
}
