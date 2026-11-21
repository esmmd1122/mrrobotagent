import Link from 'next/link'
import { notFound } from 'next/navigation'
import { randomUUID } from 'crypto'
import { getProductBySlugFromDb } from '@/lib/catalog'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { prisma } from '@/lib/db'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { SubscriptionCheckoutForm } from '@/components/subscriptions/SubscriptionCheckoutForm'
import {
  formatStoreMoney,
  validateCheckoutPricing,
} from '@/modules/commerce/pricing'
import { isProductPurchasable } from '@/modules/commerce/product-pricing'
import { formatPlanDuration } from '@/modules/commerce/plan-labels'
import { parseProductPurchaseFields } from '@/modules/commerce/purchase-fields'
import { resolveStorefrontErrorMessage } from '@/modules/commerce/error-messages'
import { getPaymentGatewayAvailability } from '@/modules/payment/registry'
import { submitSubscriptionCheckout } from './actions'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string; planId?: string }>
}

export default async function SubscriptionBuyPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const errorMessage = resolveStorefrontErrorMessage(sp.error)
  const selectedPlanId = sp.planId
  const product = await getProductBySlugFromDb(slug)
  if (!product) notFound()

  const purchasable = isProductPurchasable({
    price: product.price,
    promoPrice: product.promoPrice,
    isAvailable: product.isAvailable,
    isVisible: product.isVisible,
    plansEnabled: product.plansEnabled,
    activePlans: product.plans,
  })

  const planId = product.plansEnabled
    ? selectedPlanId && product.plans.some((p) => p.id === selectedPlanId)
      ? selectedPlanId
      : product.plans.find((p) => p.isFeatured)?.id ?? product.plans[0]?.id
    : undefined

  if (product.plansEnabled && !planId) {
    return (
      <div className="section-glow pt-24 pb-20 text-center">
        <p className="text-mr-muted">طرح فعالی برای این محصول تعریف نشده است.</p>
        <Link href={`/subscriptions/${slug}`} className="mt-4 inline-block text-mr-red underline">
          بازگشت
        </Link>
      </div>
    )
  }

  if (!purchasable) {
    return (
      <div className="section-glow pt-24 pb-20 text-center">
        <p className="text-mr-muted">این اشتراک برای خرید آنلاین در دسترس نیست.</p>
        <Link
          href={`/contact?subject=${encodeURIComponent(`خرید ${product.nameFa}`)}`}
          className="mt-4 inline-block text-mr-red underline"
        >
          درخواست تماس
        </Link>
      </div>
    )
  }

  const pricing = await validateCheckoutPricing([
    { productId: product.id, planId: planId ?? null, quantity: 1 },
  ])
  if (!pricing.ok) {
    return (
      <div className="section-glow pt-24 pb-20 text-center">
        <p className="text-mr-muted">{pricing.error}</p>
      </div>
    )
  }

  const [session, gateway] = await Promise.all([
    getCustomerSession(),
    getPaymentGatewayAvailability(),
  ])
  const customer = session
    ? await prisma.customer.findUnique({
        where: { id: session.sub },
        select: { name: true, email: true, phone: true },
      })
    : null

  const purchaseFields = parseProductPurchaseFields(product.purchaseFieldsJson ?? '[]')
  const idempotencyKey = randomUUID()
  const selectedPlanObj = planId ? product.plans.find((p) => p.id === planId) : null

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 lg:grid-cols-2">
        <div className="min-w-0">
          <Link href={`/subscriptions/${slug}`} className="text-sm text-mr-red underline">
            بازگشت به جزئیات اشتراک
          </Link>
          <h1 className="mt-4 text-3xl font-bold">خرید اشتراک</h1>
          <p className="mt-2 text-sm text-mr-muted">
            {gateway.available
              ? 'پس از تأیید، سفارش با وضعیت در انتظار پرداخت ثبت می‌شود و به درگاه پرداخت منتقل می‌شوید.'
              : 'پس از تأیید، سفارش شما با وضعیت «در انتظار پرداخت» ثبت شده و کد پیگیری اختصاصی دریافت می‌کنید.'}
          </p>
          {errorMessage ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}
          <SubscriptionCheckoutForm
            slug={slug}
            productId={product.id}
            planId={planId}
            idempotencyKey={idempotencyKey}
            purchaseFields={purchaseFields}
            defaultName={customer?.name}
            defaultEmail={customer?.email ?? undefined}
            defaultPhone={customer?.phone ?? undefined}
            onlinePaymentAvailable={gateway.available}
            subtotal={pricing.pricing.subtotal}
            currency={pricing.pricing.currency}
            submitAction={submitSubscriptionCheckout}
          />
        </div>
        <aside className="card-shop h-fit space-y-4 p-6">
          <div className="flex items-center gap-3">
            <ProductLogo slug={product.slug as 'chatgpt-plus' | 'capcut-pro' | 'grok' | 'gemini-pro'} />
            <div className="min-w-0">
              <p className="break-words font-bold" dir="ltr">
                {product.nameEn || product.nameFa}
              </p>
              <p className="text-sm text-mr-muted">{product.nameFa}</p>
            </div>
          </div>
          {selectedPlanObj ? (
            <div className="rounded-lg border border-mr-border bg-mr-charcoal/60 px-3 py-2 text-xs">
              <p className="font-semibold text-white">طرح انتخابی: {selectedPlanObj.title}</p>
              <p className="mt-0.5 text-mr-muted">
                مدت: {formatPlanDuration(selectedPlanObj.durationValue, selectedPlanObj.durationUnit)}
              </p>
            </div>
          ) : null}
          <h2 className="font-semibold">خلاصه سفارش</h2>
          <ul className="space-y-2 text-sm">
            {pricing.pricing.lines.map((l) => (
              <li key={`${l.productId}:${l.planId ?? ''}`} className="flex justify-between gap-2">
                <span className="min-w-0 break-words">
                  {l.name} × {l.quantity}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatStoreMoney(l.lineTotal, pricing.pricing.currency)}
                </span>
              </li>
            ))}
          </ul>
          {pricing.pricing.discountAmount > 0 ? (
            <p className="flex justify-between text-sm text-emerald-300">
              <span>تخفیف</span>
              <span>{formatStoreMoney(pricing.pricing.discountAmount, pricing.pricing.currency)}</span>
            </p>
          ) : null}
          <hr className="border-mr-border" />
          <p className="flex justify-between text-lg font-bold">
            <span>مبلغ نهایی</span>
            <span className="tabular-nums">
              {formatStoreMoney(pricing.pricing.total, pricing.pricing.currency)}
            </span>
          </p>
        </aside>
      </div>
    </div>
  )
}