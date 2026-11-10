import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug, subscriptionProducts } from '@/data/products'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { Button } from '@/components/ui/Button'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return subscriptionProducts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) return { title: 'اشتراک' }
  return {
    title: product.name,
    description: product.description,
  }
}

export default async function SubscriptionDetailPage({ params }: Props) {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) notFound()

  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <ProductLogo slug={product.slug as 'chatgpt-plus' | 'capcut-pro' | 'grok' | 'gemini-pro'} />
          <div>
            <h1 className="text-3xl font-bold" dir="ltr">
              {product.nameEn}
            </h1>
            <p className="mt-1 text-mr-muted">{product.description}</p>
          </div>
        </div>

        <section className="card-shop mt-10 space-y-6 p-8">
          <div>
            <h2 className="font-semibold">جزئیات اشتراک</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/90">
              {product.details.map((d) => (
                <li key={d}>• {d}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">مزایا با MR.ROBOT</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/90">
              {product.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
          <div className="border-t border-mr-border pt-6">
            <p className="text-sm text-mr-muted">قیمت (مدیریت از پنل آینده)</p>
            <p className="mt-1 text-2xl font-bold">—</p>
            <p className="mt-2 text-xs text-mr-muted">
              قیمت نهایی و شرایط فعال‌سازی پس از تماس تأیید می‌شود.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              href={`/contact?subject=${encodeURIComponent(`خرید ${product.name}`)}`}
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
