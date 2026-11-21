import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  Check,
  Headphones,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react'
import { getProductBySlugFromDb } from '@/lib/catalog'
import { getActiveWebsiteConfig } from '@/lib/site-config/service'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { PlanPurchasePanel } from '@/components/subscriptions/PlanPurchasePanel'
import { ProductDetailAccordions } from '@/components/subscriptions/ProductDetailAccordions'
import { MobileStickyBuyBar } from '@/components/subscriptions/MobileStickyBuyBar'
import { isProductPurchasable } from '@/modules/commerce/product-pricing'
import { resolveProductDisplayPrice } from '@/modules/commerce/display-price'
import { formatStoreMoney } from '@/modules/commerce/money'
import { resolveStorefrontErrorMessage } from '@/modules/commerce/error-messages'
import { buildProductFaqItems } from '@/modules/commerce/storefront-presenters'
import { parseStringListJson } from '@/lib/product-list-fields'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlugFromDb(slug)
  if (!product) return { title: 'محصول' }
  return {
    title: product.nameFa,
    description: product.description,
    openGraph: product.imageUrl
      ? {
          title: product.nameFa,
          description: product.description,
          images: [{ url: product.imageUrl, alt: product.nameFa }],
        }
      : undefined,
  }
}

export default async function SubscriptionDetailPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { error: rawError } = await searchParams
  const errorMessage = resolveStorefrontErrorMessage(rawError)

  const [product, site] = await Promise.all([
    getProductBySlugFromDb(slug),
    getActiveWebsiteConfig(),
  ])
  if (!product) notFound()

  const details = parseStringListJson(product.detailsJson)
  const features = parseStringListJson(product.featuresJson)

  const purchasable = isProductPurchasable({
    price: product.price,
    promoPrice: product.promoPrice,
    isAvailable: product.isAvailable,
    isVisible: product.isVisible,
    plansEnabled: product.plansEnabled,
    activePlans: product.plans,
  })

  const displayPrice = resolveProductDisplayPrice({
    price: product.price,
    promoPrice: product.promoPrice,
    isAvailable: product.isAvailable,
    isVisible: product.isVisible,
    plansEnabled: product.plansEnabled,
    plans: product.plans,
  })

  const planInstructions = product.plans
    .filter((p) => p.isActive && Boolean(p.fulfillmentInstructions?.trim()))
    .map((p) => ({
      planTitle: p.title,
      instructions: p.fulfillmentInstructions!.trim(),
    }))

  const hasMultiplePlans = product.plansEnabled && displayPrice.activePlanCount > 1

  const faqs = buildProductFaqItems({
    productName: product.nameFa,
    categoryName: product.category?.nameFa ?? null,
    hasMultiplePlans,
    planInstructions: planInstructions.map((i) => `${i.planTitle}: ${i.instructions}`),
    supportHours: site.footer.supportHours,
  })

  const keyHighlights = [...features, ...details].slice(0, 4)

  const mobileBuyHref = purchasable
    ? hasMultiplePlans
      ? '#buy'
      : `/subscriptions/${product.slug}/buy${
          displayPrice.defaultPlanId
            ? `?planId=${encodeURIComponent(displayPrice.defaultPlanId)}`
            : ''
        }`
    : `/contact?subject=${encodeURIComponent(`خرید ${product.nameFa}`)}`

  const mobilePriceLabel =
    displayPrice.unitPrice != null
      ? `${displayPrice.isFromPrice ? 'از ' : ''}${formatStoreMoney(displayPrice.unitPrice, product.currency)}`
      : null
  const mobileListLabel =
    displayPrice.listPrice != null
      ? formatStoreMoney(displayPrice.listPrice, product.currency)
      : null

  return (
    <div className="section-glow pt-28 pb-32 lg:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Clean Breadcrumb */}
        <nav
          aria-label="مسیر صفحه"
          className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/55"
        >
          <Link href="/" className="hover:text-white">
            خانه
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/shop" className="hover:text-white">
            فروشگاه
          </Link>
          {product.category ? (
            <>
              <span aria-hidden="true">/</span>
              <Link
                href={`/shop#${product.category.slug}`}
                className="hover:text-white"
              >
                {product.category.nameFa}
              </Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span className="text-white/90">{product.nameFa}</span>
        </nav>

        {errorMessage ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Right/Main Column (RTL): Image, Concise Buyer Summary & Expandable Details/FAQ */}
          <div className="space-y-6 lg:col-span-7">
            <article className="overflow-hidden rounded-2xl border border-white/12 bg-[#0d1018]">
              {/* Consistent 16:10 High-Resolution Product Frame */}
              <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#12182b] via-[#0a0d15] to-[#1e0a0f]">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.nameFa}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8">
                    <div className="scale-150">
                      <ProductLogo
                        slug={
                          product.slug as
                            | 'chatgpt-plus'
                            | 'capcut-pro'
                            | 'grok'
                            | 'gemini-pro'
                        }
                      />
                    </div>
                    <p
                      className="text-sm font-bold tracking-widest text-white/55"
                      dir="ltr"
                    >
                      {product.nameEn || product.nameFa}
                    </p>
                  </div>
                )}
              </div>

              {/* Clean Product Summary (No Badge Sandwich) */}
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#92a6c7]">
                  <span>{product.category?.nameFa || 'سرویس دیجیتال'}</span>
                  <span aria-hidden="true">·</span>
                  <span>تحویل دیجیتال از طریق پنل سفارش</span>
                  <span aria-hidden="true">·</span>
                  <span className={product.isAvailable ? 'font-semibold text-emerald-300' : 'text-white/55'}>
                    {product.isAvailable ? 'موجود و آماده ثبت سفارش' : 'فعلاً ناموجود'}
                  </span>
                </div>

                <h1 className="mt-2.5 break-words text-2xl font-black text-white [text-wrap:balance] sm:text-3xl">
                  {product.nameFa}
                </h1>
                {product.nameEn ? (
                  <p className="mt-1 text-xs tracking-wider text-white/45" dir="ltr">
                    {product.nameEn}
                  </p>
                ) : null}

                <p className="mt-3.5 text-sm leading-relaxed text-[#b9c8e3] sm:text-base">
                  {product.description}
                </p>

                {/* Short Scannable Summary Highlights */}
                {keyHighlights.length > 0 ? (
                  <ul className="mt-5 grid gap-2 border-t border-white/10 pt-4 text-xs text-white/85 sm:grid-cols-2 sm:text-sm">
                    {keyHighlights.map((item, idx) => (
                      <li key={`hi-${idx}`} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#e10600]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>

            {/* Expandable Detailed Sections: Delivery, Activation, Support & FAQs */}
            <ProductDetailAccordions
              productName={product.nameFa}
              categoryName={product.category?.nameFa}
              details={details}
              features={features}
              planInstructions={planInstructions}
              faqs={faqs}
              supportHours={site.footer.supportHours}
              contactPhone={site.footer.contactPhone}
              contactEmail={site.footer.contactEmail}
            />
          </div>

          {/* Left/Sticky Column (RTL): Contiguous Purchase Module + Compact Trust Block */}
          <aside id="buy" className="scroll-mt-28 space-y-4 lg:sticky lg:top-28 lg:col-span-5">
            <div className="rounded-2xl border border-white/12 bg-[#0d1018] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-base font-extrabold text-white">انتخاب طرح و سفارش</h2>
                <span className="text-xs text-white/50">محاسبه دقیق در سرور</span>
              </div>

              {purchasable ? (
                <PlanPurchasePanel
                  productId={product.id}
                  productName={product.nameFa}
                  productSlug={product.slug}
                  plansEnabled={product.plansEnabled}
                  legacyPrice={product.price}
                  legacyPromo={product.promoPrice}
                  currency={product.currency}
                  plans={product.plans.map((p) => ({
                    id: p.id,
                    title: p.title,
                    description: p.description,
                    price: p.price,
                    promoPrice: p.promoPrice,
                    durationValue: p.durationValue,
                    durationUnit: p.durationUnit,
                    fulfillmentInstructions: p.fulfillmentInstructions,
                    isFeatured: p.isFeatured,
                  }))}
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-[#a8bad8]">
                    این سرویس در حال حاضر نیاز به استعلام قیمت یا ثبت درخواست اختصاصی دارد. از طریق پشتیبانی MR.ROBOT می‌توانید سفارش خود را ثبت کنید.
                  </p>
                  <Link
                    href={`/contact?subject=${encodeURIComponent(`خرید ${product.nameFa}`)}`}
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-[#e10600]/25 transition hover:bg-[#c80500]"
                  >
                    <Headphones className="h-4 w-4" />
                    <span>تماس برای خرید و مشاوره</span>
                  </Link>
                </div>
              )}

              {/* Compact, Factual Trust & Support Block Adjacent to Purchase Actions */}
              <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs text-[#a8bad8]">
                <div className="flex items-start gap-2.5">
                  <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#38bdf8]" />
                  <span>تحویل دیجیتال و پیگیری مرحله‌به‌مرحله در پنل کاربری و صفحه پیگیری سفارش</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>صدور شماره پیگیری یکتا و محاسبه شفاف مبلغ نهایی در سرور</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#ff4d48]" />
                  <span>
                    پشتیبانی مستقیم MR.ROBOT
                    {site.footer.supportHours?.trim()
                      ? ` (${site.footer.supportHours.trim()})`
                      : ''}
                    {' — '}
                    <Link
                      href={`/contact?subject=${encodeURIComponent(`پشتیبانی ${product.nameFa}`)}`}
                      className="font-semibold text-white underline decoration-white/35 hover:text-[#ff4d48]"
                    >
                      سوال پیش از خرید دارید؟
                    </Link>
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>بازگشت به فهرست محصولات فروشگاه</span>
            </Link>
          </aside>
        </div>
      </div>

      {/* Mobile-only Sticky Bottom Purchase Bar (price + primary action always reachable) */}
      <MobileStickyBuyBar
        priceLabel={mobilePriceLabel}
        listPriceLabel={mobileListLabel}
        buyHref={mobileBuyHref}
        ctaLabel={
          purchasable
            ? hasMultiplePlans
              ? 'انتخاب طرح و خرید'
              : 'خرید فوری'
            : 'استعلام و خرید'
        }
        isAnchor={mobileBuyHref.startsWith('#')}
      />
    </div>
  )
}
