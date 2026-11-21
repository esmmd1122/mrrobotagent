import Link from 'next/link'
import { notFound } from 'next/navigation'
import { randomUUID } from 'crypto'
import { ArrowRight, Headphones, ShieldCheck } from 'lucide-react'
import { getProductBySlugFromDb } from '@/lib/catalog'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { getActiveWebsiteConfig } from '@/lib/site-config/service'
import { prisma } from '@/lib/db'
import { CheckoutSteps } from '@/components/shop/CheckoutSteps'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { SubscriptionCheckoutForm } from '@/components/subscriptions/SubscriptionCheckoutForm'
import {
  formatStoreMoney,
  validateCheckoutPricing,
} from '@/modules/commerce/pricing'
import { computeCartSavings } from '@/modules/commerce/storefront-presenters'
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
      <div className="section-glow pt-28 pb-20 text-center">
        <div className="mx-auto max-w-md px-4">
          <div className="card-shop space-y-4 p-8">
            <p className="text-sm text-[#a8bad8]">طرح فعالی برای این محصول تعریف نشده است.</p>
            <Link
              href={`/subscriptions/${slug}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#e10600] px-5 py-2 text-sm font-bold text-white"
            >
              بازگشت به جزئیات محصول
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!purchasable) {
    return (
      <div className="section-glow pt-28 pb-20 text-center">
        <div className="mx-auto max-w-md px-4">
          <div className="card-shop space-y-4 p-8">
            <p className="text-sm text-[#a8bad8]">این اشتراک در حال حاضر برای خرید آنلاین در دسترس نیست.</p>
            <Link
              href={`/contact?subject=${encodeURIComponent(`خرید ${product.nameFa}`)}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#e10600] px-5 py-2 text-sm font-bold text-white"
            >
              استعلام و درخواست تماس
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const pricing = await validateCheckoutPricing([
    { productId: product.id, planId: planId ?? null, quantity: 1 },
  ])
  if (!pricing.ok) {
    return (
      <div className="section-glow pt-28 pb-20 text-center">
        <div className="mx-auto max-w-md px-4">
          <div className="card-shop space-y-4 p-8">
            <p className="text-sm text-[#a8bad8]">{pricing.error}</p>
            <Link
              href={`/subscriptions/${slug}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#e10600] px-5 py-2 text-sm font-bold text-white"
            >
              بازگشت به صفحه محصول
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const [session, gateway, site] = await Promise.all([
    getCustomerSession(),
    getPaymentGatewayAvailability(),
    getActiveWebsiteConfig(),
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
  const catalogSavings = computeCartSavings(pricing.pricing.lines)
  const supportHours = site.footer.supportHours?.trim()

  return (
    <div className="section-glow pt-28 pb-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <CheckoutSteps current="checkout" />

        <div className="mb-4">
          <Link
            href={`/subscriptions/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a8bad8] transition hover:text-white"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>بازگشت به جزئیات {product.nameFa}</span>
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 lg:col-span-7">
            <p className="text-xs font-semibold text-[#ff5a56]">خرید سریع و مستقیم</p>
            <h1 className="mt-1 text-3xl font-black text-white">ثبت سفارش {product.nameFa}</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#a8bad8]">
              {gateway.available
                ? 'پس از تکمیل اطلاعات و تأیید، سفارش با وضعیت «در انتظار پرداخت» ثبت می‌شود و به درگاه پرداخت منتقل می‌شوید.'
                : 'پس از تکمیل اطلاعات و تأیید، سفارش شما با وضعیت «در انتظار پرداخت» ثبت شده و کد پیگیری اختصاصی دریافت می‌کنید.'}
            </p>
            {errorMessage ? (
              <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
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

          <aside className="space-y-4 rounded-2xl border border-white/12 bg-[#0d1018] p-6 lg:sticky lg:top-28 lg:col-span-5">
            <div className="flex items-center gap-3.5 border-b border-white/10 pb-4">
              <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#121622]">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.nameFa}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ProductLogo
                    slug={
                      product.slug as
                        | 'chatgpt-plus'
                        | 'capcut-pro'
                        | 'grok'
                        | 'gemini-pro'
                    }
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-extrabold text-white">
                  {product.nameFa}
                </p>
                {product.nameEn ? (
                  <p className="truncate text-xs text-[#a8bad8]" dir="ltr">
                    {product.nameEn}
                  </p>
                ) : null}
              </div>
            </div>

            {selectedPlanObj ? (
              <div className="rounded-xl border border-white/10 bg-[#121622] px-3.5 py-2.5 text-xs">
                <p className="font-bold text-white">طرح انتخابی: {selectedPlanObj.title}</p>
                <p className="mt-0.5 text-[#38bdf8]">
                  مدت اعتبار: {formatPlanDuration(selectedPlanObj.durationValue, selectedPlanObj.durationUnit)}
                </p>
                {selectedPlanObj.fulfillmentInstructions ? (
                  <p className="mt-1.5 leading-relaxed text-[#a8bad8]">
                    {selectedPlanObj.fulfillmentInstructions}
                  </p>
                ) : null}
              </div>
            ) : null}

            <h2 className="text-sm font-extrabold text-white">خلاصه سفارش</h2>
            <ul className="space-y-2 text-sm">
              {pricing.pricing.lines.map((l) => (
                <li key={`${l.productId}:${l.planId ?? ''}`} className="flex justify-between gap-2">
                  <span className="min-w-0 break-words text-[#d7e2f5]">
                    {l.name} × {l.quantity.toLocaleString('fa-IR')}
                  </span>
                  <span className="shrink-0 font-semibold text-white tabular-nums">
                    {formatStoreMoney(l.lineTotal, pricing.pricing.currency)}
                  </span>
                </li>
              ))}
            </ul>

            {catalogSavings > 0 ? (
              <p className="flex justify-between text-xs text-emerald-300">
                <span>سود شما از تخفیف محصول</span>
                <span className="font-semibold tabular-nums">
                  {formatStoreMoney(catalogSavings, pricing.pricing.currency)}
                </span>
              </p>
            ) : null}

            {pricing.pricing.discountAmount > 0 ? (
              <p className="flex justify-between text-xs text-emerald-300">
                <span>تخفیف</span>
                <span className="tabular-nums">
                  {formatStoreMoney(pricing.pricing.discountAmount, pricing.pricing.currency)}
                </span>
              </p>
            ) : null}

            <hr className="border-white/10" />
            <p className="flex justify-between text-lg font-black text-white">
              <span>مبلغ قابل پرداخت</span>
              <span className="tabular-nums">
                {formatStoreMoney(pricing.pricing.total, pricing.pricing.currency)}
              </span>
            </p>

            <div className="space-y-2 rounded-xl border border-white/10 bg-[#121622] p-3.5 text-xs leading-relaxed text-[#a8bad8]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#38bdf8]" />
                <span>
                  پس از ثبت سفارش، شماره پیگیری یکتا دریافت می‌کنید و وضعیت تحویل در صفحه پیگیری قابل مشاهده است.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  سوالی پیش از پرداخت دارید؟{' '}
                  <Link href="/contact" className="text-white underline decoration-white/30 hover:text-[#ff4d48]">
                    ارتباط با پشتیبانی
                  </Link>
                  {supportHours ? ` (${supportHours})` : ''}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}