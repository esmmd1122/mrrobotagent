import Link from 'next/link'
import { getProductCategories } from '@/lib/catalog'
import { formatStoreMoney } from '@/modules/commerce/pricing'
import { resolveProductDisplayPrice } from '@/modules/commerce/display-price'
import { AddToCartButton } from '@/components/cart/AddToCartButton'

export default async function ShopPage() {
  const categories = await getProductCategories()

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="max-w-2xl">
          <p className="text-xs tracking-[0.28em] text-mr-red">STORE</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">خدمات و اشتراک‌های دیجیتال</h1>
          <p className="mt-3 text-mr-muted">
            قیمت‌ها در سرور محاسبه می‌شوند. پس از انتخاب، به سبد خرید اضافه کنید یا مستقیم وارد مرحله ثبت سفارش شوید.
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
                      ? `/subscriptions/${p.slug}`
                      : `/subscriptions/${p.slug}/buy${priceInfo.defaultPlanId ? `?planId=${encodeURIComponent(priceInfo.defaultPlanId)}` : ''}`

                    return (
                      <li key={p.id} className="card-shop flex flex-col p-5">
                        <h3 className="break-words font-semibold">{p.nameFa}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-mr-muted">{p.description}</p>
                        <div className="mt-3 flex flex-wrap items-baseline gap-2">
                          <p className="text-lg font-bold text-white tabular-nums">
                            {priceInfo.unitPrice != null
                              ? `${priceInfo.isFromPrice ? 'از ' : ''}${formatStoreMoney(priceInfo.unitPrice, p.currency)}`
                              : 'تماس بگیرید'}
                          </p>
                          {priceInfo.listPrice != null ? (
                            <span className="text-xs text-mr-muted line-through tabular-nums">
                              {formatStoreMoney(priceInfo.listPrice, p.currency)}
                            </span>
                          ) : null}
                        </div>
                        {hasMultiplePlans ? (
                          <p className="mt-1 text-xs text-sky-300">
                            دارای {priceInfo.activePlanCount.toLocaleString('fa-IR')} طرح قابل انتخاب
                          </p>
                        ) : null}

                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                          {priceInfo.purchasable ? (
                            <>
                              <Link
                                href={directBuyHref}
                                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-mr-red px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                              >
                                {hasMultiplePlans ? 'انتخاب طرح و خرید' : 'خرید اشتراک'}
                              </Link>
                              {!hasMultiplePlans ? (
                                <AddToCartButton
                                  productId={p.id}
                                  planId={priceInfo.defaultPlanId}
                                  productLabel={p.nameFa}
                                  label="افزودن به سبد"
                                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-mr-border px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/5 disabled:opacity-60"
                                />
                              ) : null}
                            </>
                          ) : (
                            <Link
                              href={`/contact?subject=${encodeURIComponent(`خرید ${p.nameFa}`)}`}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-mr-border px-4 py-2 text-sm text-white hover:bg-white/5"
                            >
                              تماس برای خرید
                            </Link>
                          )}
                          <Link
                            href={`/subscriptions/${p.slug}`}
                            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-mr-border px-3.5 py-2 text-sm text-mr-muted hover:bg-white/5 hover:text-white"
                          >
                            جزئیات
                          </Link>
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