import Link from 'next/link'
import { readCart } from '@/modules/commerce/cart-cookie'
import { calculateCartPricing, formatStoreMoney } from '@/modules/commerce/pricing'
import { CartLineActions } from '@/components/cart/CartLineActions'
import { goToCheckout } from './actions'

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const lines = await readCart()
  const pricing = await calculateCartPricing(lines)
  const error = (await searchParams).error

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold">سبد خرید</h1>
        {error ? (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {decodeURIComponent(error)}
          </p>
        ) : null}
        {pricing.lines.length === 0 ? (
          <div className="card-shop mt-8 p-8 text-center">
            <p className="text-mr-muted">سبد شما خالی است.</p>
            <Link href="/shop" className="mt-4 inline-block text-mr-red underline">
              مشاهده فروشگاه
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {pricing.lines.map((line) => (
              <article
                key={`${line.productId}:${line.planId || ''}`}
                className="card-shop flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link href={`/subscriptions/${line.slug}`} className="font-semibold hover:text-mr-red">
                    {line.name}
                  </Link>
                  <p className="mt-1 text-sm text-mr-muted">
                    {formatStoreMoney(line.unitPrice)} × {line.quantity}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <p className="font-semibold tabular-nums">{formatStoreMoney(line.lineTotal)}</p>
                  <CartLineActions productId={line.productId} planId={line.planId} quantity={line.quantity} />
                </div>
              </article>
            ))}
            <aside className="card-shop space-y-2 p-6">
              <p className="flex justify-between text-sm">
                <span className="text-mr-muted">جمع جزء</span>
                <span className="tabular-nums">{formatStoreMoney(pricing.subtotal)}</span>
              </p>
              <p className="flex justify-between text-lg font-bold">
                <span>قابل پرداخت</span>
                <span className="tabular-nums">{formatStoreMoney(pricing.total)}</span>
              </p>
              <form action={goToCheckout} className="pt-2">
                <button type="submit" className="w-full rounded-xl bg-mr-red py-3 font-semibold">
                  ادامه تسویه‌حساب
                </button>
              </form>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}