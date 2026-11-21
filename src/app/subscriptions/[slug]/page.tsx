import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Headphones,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
} from 'lucide-react'
import { getProductBySlugFromDb } from '@/lib/catalog'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { PlanPurchasePanel } from '@/components/subscriptions/PlanPurchasePanel'
import { isProductPurchasable } from '@/modules/commerce/product-pricing'
import { resolveStorefrontErrorMessage } from '@/modules/commerce/error-messages'

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
  const product = await getProductBySlugFromDb(slug)
  if (!product) notFound()

  let details: string[] = []
  let features: string[] = []
  try {
    const parsedDetails = JSON.parse(product.detailsJson)
    const parsedFeatures = JSON.parse(product.featuresJson)
    details = Array.isArray(parsedDetails)
      ? parsedDetails.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : []
    features = Array.isArray(parsedFeatures)
      ? parsedFeatures.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : []
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
    <div className="section-glow pt-28 pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="مسیر صفحه"
          className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/55"
        >
          <Link href="/" className="hover:text-white">
            خانه
          </Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-white">
            فروشگاه
          </Link>
          {product.category ? (
            <>
              <span>/</span>
              <Link
                href={`/shop#${product.category.slug}`}
                className="hover:text-white"
              >
                {product.category.nameFa}
              </Link>
            </>
          ) : null}
          <span>/</span>
          <span className="text-white/90">{product.nameFa}</span>
        </nav>

        {errorMessage ? (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Right/Main Column (RTL): Image Showcase, Product Info, Specs & Post-Purchase Guidance */}
          <div className="space-y-6 lg:col-span-7">
            {/* Consistent 16:10 High-Resolution Media Frame */}
            <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0d1018] shadow-xl">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#12182b] via-[#0a0d15] to-[#1e0a0f]">
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

                <div className="absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold backdrop-blur-md ${
                        product.isAvailable
                          ? 'border-emerald-500/40 bg-black/70 text-emerald-300'
                          : 'border-white/20 bg-black/75 text-white/60'
                      }`}
                    >
                      {product.isAvailable ? 'موجود و آماده ثبت سفارش' : 'فعلاً ناموجود'}
                    </span>
                    {product.isFeatured ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#e10600]/60 bg-[#e10600]/90 px-2.5 py-1 text-xs font-bold text-white">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>محصول پیشنهادی</span>
                      </span>
                    ) : null}
                  </div>

                  {product.category ? (
                    <span className="rounded-md border border-white/15 bg-black/65 px-2.5 py-1 text-xs text-white/80 backdrop-blur-md">
                      {product.category.nameFa}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="p-6">
                <h1 className="break-words text-2xl font-black text-white sm:text-3xl">
                  {product.nameFa}
                </h1>
                {product.nameEn ? (
                  <p className="mt-1 text-xs tracking-wider text-white/45" dir="ltr">
                    {product.nameEn}
                  </p>
                ) : null}
                <p className="mt-4 text-sm leading-relaxed text-[#a8bad8] sm:text-base">
                  {product.description}
                </p>
              </div>
            </div>

            {/* Real Details & Features from DB */}
            {(details.length > 0 || features.length > 0) ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {details.length > 0 ? (
                  <section className="rounded-2xl border border-white/10 bg-[#0d1018] p-5">
                    <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                      <ClipboardList className="h-4 w-4 text-[#38bdf8]" />
                      <span>جزئیات و مشخصات سرویس</span>
                    </h2>
                    <ul className="mt-3.5 space-y-2.5 text-sm text-white/85">
                      {details.map((d, idx) => (
                        <li key={`det-${idx}`} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#38bdf8]" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {features.length > 0 ? (
                  <section className="rounded-2xl border border-white/10 bg-[#0d1018] p-5">
                    <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                      <CheckCircle2 className="h-4 w-4 text-[#e10600]" />
                      <span>مزایا و ویژگی‌ها با MR.ROBOT</span>
                    </h2>
                    <ul className="mt-3.5 space-y-2.5 text-sm text-white/85">
                      {features.map((f, idx) => (
                        <li key={`feat-${idx}`} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e10600]" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}

            {/* Clear Post-Purchase Guidance */}
            <section className="rounded-2xl border border-white/10 bg-[#0d1018] p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <ShieldCheck className="h-4 w-4 text-[#e10600]" />
                <span>فرآیند ثبت سفارش و تحویل در MR.ROBOT</span>
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/8 bg-[#121622] p-3.5">
                  <p className="text-[11px] font-bold text-[#38bdf8]">گام ۱ — انتخاب و ثبت</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#a8bad8]">
                    طرح و تعداد مورد نظر را انتخاب کرده و مستقیم وارد تسویه‌حساب شوید یا به سبد خرید اضافه کنید.
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-[#121622] p-3.5">
                  <p className="text-[11px] font-bold text-[#38bdf8]">گام ۲ — پیگیری در پنل</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#a8bad8]">
                    پس از ثبت سفارش، شماره پیگیری اختصاصی صادر می‌شود و وضعیت سفارش در حساب کاربری قابل مشاهده است.
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-[#121622] p-3.5">
                  <p className="text-[11px] font-bold text-[#e10600]">گام ۳ — پشتیبانی مستقیم</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#a8bad8]">
                    در تمام مراحل فعال‌سازی یا پرسش پیش از خرید، تیم پشتیبانی از طریق تیکت پاسخ‌گوی شماست.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Left/Sticky Column (RTL): Purchase & Plan Panel */}
          <aside id="buy" className="space-y-4 lg:sticky lg:top-28 lg:col-span-5">
            <div className="rounded-2xl border border-white/12 bg-[#0d1018] p-5 shadow-xl sm:p-6">
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
                    isFeatured: p.isFeatured,
                  }))}
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[#a8bad8]">
                    برای استعلام قیمت به‌روز یا سفارش اختصاصی این سرویس با تیم پشتیبانی تماس بگیرید.
                  </p>
                  <Link
                    href={`/contact?subject=${encodeURIComponent(`خرید ${product.nameFa}`)}`}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c80500]"
                  >
                    <Headphones className="h-4 w-4" />
                    <span>تماس برای خرید و مشاوره</span>
                  </Link>
                </div>
              )}

              {/* Helpful Secondary Navigation Links */}
              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                <Link
                  href="/cart"
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/85 transition hover:border-white/25 hover:text-white"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-[#ff4d48]" />
                  <span>مشاهده سبد خرید</span>
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/85 transition hover:border-white/25 hover:text-white"
                >
                  <Store className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>ادامه خرید</span>
                </Link>
                <Link
                  href={`/contact?subject=${encodeURIComponent(`پشتیبانی ${product.nameFa}`)}`}
                  className="col-span-2 inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-white/70 transition hover:border-white/25 hover:bg-white/[0.04] hover:text-white"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>سوالی پیش از خرید دارید؟ گفتگو با پشتیبانی</span>
                </Link>
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
    </div>
  )
}
