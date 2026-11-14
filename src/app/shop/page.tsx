import Link from 'next/link'
import { getProductCategories } from '@/lib/catalog'
import { effectiveUnitPrice, formatStoreMoney } from '@/modules/commerce/pricing'
import { isProductPurchasable } from '@/modules/commerce/product-pricing'
export default async function ShopPage() {
  const categories = await getProductCategories()

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="max-w-2xl">
          <p className="text-xs tracking-[0.28em] text-mr-red">STORE</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">خدمات و اشتراک‌های دیجیتال</h1>
          <p className="mt-3 text-mr-muted">
            قیمت‌ها در سرور محاسبه می‌شوند. پس از انتخاب، به سبد خرید اضافه کنید و در تسویه‌حساب سفارش ثبت
            می‌شود.
          </p>
        </header>

        <div className="mt-12 space-y-14">
          {categories.map((cat) =>
            cat.products.length === 0 ? null : (
              <section key={cat.id} id={cat.slug}>
                <h2 className="text-xl font-semibold">{cat.nameFa}</h2>
                {cat.nameEn ? <p className="text-sm text-mr-muted" dir="ltr">{cat.nameEn}</p> : null}
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.products.map((p) => {
                    const unit = effectiveUnitPrice(p.price, p.promoPrice)
                    return (
                      <li key={p.id} className="card-shop flex flex-col p-5">
                        <h3 className="font-semibold">{p.nameFa}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-mr-muted">{p.description}</p>
                        <p className="mt-3 text-lg font-bold text-white">
                          {unit != null ? formatStoreMoney(unit) : 'تماس بگیرید'}
                        </p>
                        <div className="mt-auto flex flex-wrap gap-2 pt-4">
                          <Link
                            href={`/subscriptions/${p.slug}`}
                            className="rounded-lg border border-mr-border px-4 py-2 text-sm hover:bg-white/5"
                          >
                            جزئیات
                          </Link>
                          {isProductPurchasable({
                            price: p.price,
                            promoPrice: p.promoPrice,
                            isAvailable: p.isAvailable,
                            isVisible: p.isVisible,
                            plansEnabled: p.plansEnabled,
                            activePlans: p.plans,
                          }) ? (
                            <Link
                              href={`/subscriptions/${p.slug}`}
                              className="rounded-lg bg-mr-red px-4 py-2 text-sm font-semibold"
                            >
                              خرید اشتراک
                            </Link>
                          ) : (
                            <Link
                              href={`/contact?subject=${encodeURIComponent(`خرید ${p.nameFa}`)}`}
                              className="rounded-lg border border-mr-border px-4 py-2 text-sm"
                            >
                              تماس
                            </Link>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ),
          )}
        </div>
      </div>
    </div>
  )
}