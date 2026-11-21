import Link from 'next/link'
import { ArrowLeft, Headphones, PackageCheck, ShieldCheck } from 'lucide-react'
import { getProductCategories } from '@/lib/catalog'
import { getActiveWebsiteConfig } from '@/lib/site-config/service'
import { resolveProductDisplayPrice } from '@/modules/commerce/display-price'
import { calculateDiscountPercent } from '@/lib/site-config/cms-helpers'
import {
  ShopCatalogClient,
  type ShopCatalogCategoryGroup,
} from '@/components/shop/ShopCatalogClient'

function parseFeaturePreview(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .slice(0, 2)
    }
  } catch {
    return []
  }
  return []
}

export default async function ShopPage() {
  const [categories, site] = await Promise.all([
    getProductCategories(),
    getActiveWebsiteConfig(),
  ])

  const catalogGroups: ShopCatalogCategoryGroup[] = categories
    .filter((c) => c.products.length > 0)
    .map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      nameFa: cat.nameFa,
      nameEn: cat.nameEn,
      products: cat.products.map((p) => {
        const priceInfo = resolveProductDisplayPrice({
          price: p.price,
          promoPrice: p.promoPrice,
          isAvailable: p.isAvailable,
          isVisible: p.isVisible,
          plansEnabled: p.plansEnabled,
          plans: p.plans,
        })
        const hasMultiplePlans = p.plansEnabled && priceInfo.activePlanCount > 1
        const directBuyHref = hasMultiplePlans
          ? `/subscriptions/${p.slug}#buy`
          : `/subscriptions/${p.slug}/buy${
              priceInfo.defaultPlanId
                ? `?planId=${encodeURIComponent(priceInfo.defaultPlanId)}`
                : ''
            }`
        return {
          id: p.id,
          slug: p.slug,
          nameFa: p.nameFa,
          nameEn: p.nameEn,
          description: p.description,
          imageUrl: p.imageUrl,
          currency: p.currency,
          isAvailable: p.isAvailable,
          isFeatured: p.isFeatured,
          plansEnabled: p.plansEnabled,
          activePlanCount: priceInfo.activePlanCount,
          defaultPlanId: priceInfo.defaultPlanId,
          unitPrice: priceInfo.unitPrice,
          listPrice: priceInfo.listPrice,
          isFromPrice: priceInfo.isFromPrice,
          purchasable: priceInfo.purchasable,
          discountPct: calculateDiscountPercent(priceInfo.listPrice, priceInfo.unitPrice),
          previewFeatures: parseFeaturePreview(p.featuresJson),
          directBuyHref,
        }
      }),
    }))

  const totalProducts = catalogGroups.reduce((sum, c) => sum + c.products.length, 0)
  const footer = site.footer

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Clean Storefront Header */}
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#ff5a56]">
              فروشگاه رسمی MR.ROBOT
            </p>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white [text-wrap:balance] sm:text-3xl">
              اشتراک‌ها و خدمات دیجیتال با خرید شفاف و مستقیم
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#a8bad8]">
              سرویس مورد نظر خود را جستجو یا از بین دسته‌بندی‌ها انتخاب کنید. تمامی قیمت‌ها، طرح‌ها و تخفیف‌ها به‌صورت دقیق در سرور محاسبه شده و پس از ثبت سفارش کد پیگیری اختصاصی دریافت می‌کنید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#a8bad8]">
            <span className="tabular-nums">
              <strong className="text-white">{totalProducts.toLocaleString('fa-IR')}</strong> محصول فعال
            </span>
            <span aria-hidden="true">·</span>
            <Link href="/orders/track" className="text-white/85 underline decoration-white/30 hover:text-[#ff4d48]">
              پیگیری سفارش ثبت‌شده
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/contact" className="text-white/85 underline decoration-white/30 hover:text-[#ff4d48]">
              مشاوره پیش از خرید
            </Link>
          </div>
        </header>

        {catalogGroups.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-white/10 bg-[#0d1018] p-10 text-center">
            <p className="text-base font-bold text-white">
              در حال حاضر محصول فعالی برای نمایش وجود ندارد.
            </p>
            <p className="mt-2 text-sm text-[#a8bad8]">
              برای استعلام یا ثبت سفارش اختصاصی می‌توانید با پشتیبانی MR.ROBOT در ارتباط باشید.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#e10600] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#c80500]"
            >
              <span>تماس با پشتیبانی</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <ShopCatalogClient categories={catalogGroups} />
        )}

        {/* Real Customer Trust & Buying Process Section */}
        <section
          aria-label="راهنمای خرید و اعتماد در MR.ROBOT"
          className="mt-16 rounded-2xl border border-white/10 bg-[#0d1018] p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-lg font-extrabold text-white sm:text-xl">
                خرید از MR.ROBOT چگونه انجام می‌شود؟
              </h2>
              <p className="mt-1 text-xs text-[#a8bad8] sm:text-sm">
                فرآیند شفاف از انتخاب محصول تا پیگیری و پشتیبانی مستقیم
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white transition hover:border-[#e10600]/60 hover:bg-[#e10600]/10"
            >
              <Headphones className="h-3.5 w-3.5 text-[#ff4d48]" />
              <span>سوالی دارید؟ گفتگو با پشتیبانی</span>
            </Link>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <ShieldCheck className="h-4 w-4 text-[#e10600]" />
                <span>۱. انتخاب و مشاهده قیمت دقیق</span>
              </div>
              <p className="text-xs leading-relaxed text-[#a8bad8]">
                در صفحه هر محصول، توضیحات، ویژگی‌ها و طرح‌های فعال آن را ببینید. قیمت نهایی و تخفیف‌ها پیش از تسویه‌حساب در سرور محاسبه می‌شوند.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <PackageCheck className="h-4 w-4 text-[#38bdf8]" />
                <span>۲. ثبت سفارش و تحویل دیجیتال</span>
              </div>
              <p className="text-xs leading-relaxed text-[#a8bad8]">
                پس از ثبت سفارش، شماره پیگیری اختصاصی صادر می‌شود. اطلاعات فعال‌سازی یا فایل‌های تحویل در{' '}
                <Link href="/account/orders" className="text-white underline decoration-white/30 hover:text-[#ff4d48]">
                  حساب کاربری
                </Link>{' '}
                و{' '}
                <Link href="/orders/track" className="text-white underline decoration-white/30 hover:text-[#ff4d48]">
                  صفحه پیگیری سفارش
                </Link>{' '}
                در دسترس قرار می‌گیرند.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Headphones className="h-4 w-4 text-emerald-400" />
                <span>۳. پشتیبانی و پاسخ‌گویی مستقیم</span>
              </div>
              <p className="text-xs leading-relaxed text-[#a8bad8]">
                تیم MR.ROBOT در مراحل پیش از خرید و فعال‌سازی کنار شماست.
                {footer.supportHours?.trim() ? ` ساعات پاسخ‌گویی: ${footer.supportHours.trim()}.` : ''}
                {footer.contactPhone?.trim() ? ` تلفن: ${footer.contactPhone.trim()}.` : ''}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}