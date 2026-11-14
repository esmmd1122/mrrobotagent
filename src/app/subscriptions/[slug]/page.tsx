import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlugFromDb } from '@/lib/catalog'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { Button } from '@/components/ui/Button'
import { PlanPurchasePanel } from '@/components/subscriptions/PlanPurchasePanel'
import { isProductPurchasable } from '@/modules/commerce/product-pricing'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlugFromDb(slug)
  if (!product) return { title: 'اشتراک' }
  return {
    title: product.nameFa,
    description: product.description,
  }
}

export default async function SubscriptionDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlugFromDb(slug)
  if (!product) notFound()

  let details: string[] = []
  let features: string[] = []
  try {
    details = JSON.parse(product.detailsJson)
    features = JSON.parse(product.featuresJson)
  } catch {
    details = []
    features = []
  }

  const purchasable = isProductPurchasable({
    price: product.price,
    promoPrice: product.promoPrice,
    isAvailable: product.isAvailable,
    isVisible: product.isVisible,
    plansEnabled: product.plansEnabled,
    activePlans: product.plans,
  })

  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <ProductLogo slug={product.slug as 'chatgpt-plus' | 'capcut-pro' | 'grok' | 'gemini-pro'} />
          <div>
            <h1 className="text-3xl font-bold" dir="ltr">
              {product.nameEn || product.nameFa}
            </h1>
            <p className="mt-1 text-mr-muted">{product.description}</p>
          </div>
        </div>

        <section className="card-shop mt-10 space-y-6 p-8">
          <div>
            <h2 className="font-semibold">جزئیات اشتراک</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/90">
              {details.map((d) => (
                <li key={d}>• {d}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">مزایا با MR.ROBOT</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/90">
              {features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
          <div id="buy" className="border-t border-mr-border pt-6">
            {purchasable ? (
              <PlanPurchasePanel
                productId={product.id}
                productSlug={product.slug}
                plansEnabled={product.plansEnabled}
                legacyPrice={product.price}
                legacyPromo={product.promoPrice}
                plans={product.plans.map((p) => ({
                  id: p.id,
                  title: p.title,
                  description: p.description,
                  price: p.price,
                  promoPrice: p.promoPrice,
                  durationValue: p.durationValue,
                  durationUnit: p.durationUnit,
                  isFeatured: p.isFeatured,
                }))}
              />
            ) : (
              <Button
                href={`/contact?subject=${encodeURIComponent(`خرید ${product.nameFa}`)}`}
                variant="primary"
              >
                تماس برای خرید
              </Button>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button href="/cart" variant="secondary">
                مشاهده سبد
              </Button>
              <Button href="/shop" variant="secondary">
                فروشگاه
              </Button>
              <Button
                href={`/contact?subject=${encodeURIComponent(`پشتیبانی ${product.nameFa}`)}`}
                variant="secondary"
              >
                سوال قبل از خرید
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
