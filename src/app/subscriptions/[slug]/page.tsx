import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlugFromDb } from '@/lib/catalog'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { Button } from '@/components/ui/Button'

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
          <div className="border-t border-mr-border pt-6">
            <p className="text-sm text-mr-muted">قیمت</p>
            <p className="mt-1 text-2xl font-bold">
              {product.promoPrice != null
                ? product.promoPrice.toLocaleString('fa-IR')
                : product.price != null
                  ? product.price.toLocaleString('fa-IR')
                  : '—'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              href={`/contact?subject=${encodeURIComponent(`خرید ${product.nameFa}`)}`}
              variant="primary"
            >
              درخواست خرید
            </Button>
            <Button href="/#subscriptions" variant="secondary">
              بازگشت به اشتراک‌ها
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
