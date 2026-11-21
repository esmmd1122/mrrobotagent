import Link from 'next/link'
import { readCart } from '@/modules/commerce/cart-cookie'
import { calculateCartPricing, formatStoreMoney } from '@/modules/commerce/pricing'
import { resolveStorefrontErrorMessage } from '@/modules/commerce/error-messages'
import { CartLineActions } from '@/components/cart/CartLineActions'
import { PruneStaleCartButton } from '@/components/cart/PruneStaleCartButton'
import { goToCheckout } from './actions'

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const lines = await readCart()
  const pricing = await calculateCartPricing(lines)
  const rawError = (await searchParams).error
  const errorMessage = resolveStorefrontErrorMessage(rawError)
  const staleCount = Math.max(0, lines.length - pricing.lines.length)

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold">سبد خرید</h1>
        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {errorMessage}
          </p>
        ) : null}
        {staleCount > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p>
              {staleCount.toLocaleString('fa-IR')} مورد در سبد خرید شما دیگر موجود نیست یا قیمت/طرح آن تغییر کرده است. برای ادامه تسویه‌حساب آن را حذف کنید.
            </p>
            <PruneStaleCartButton />
          </div>
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
                <div className="min-w-0">
                  <Link
                    href={`/subscriptions/${line.slug}`}
                    className="block break-words font-semibold hover:text-mr-red"
                  >
                    {line.productName}
                  </Link>
                  {line.planTitle ? (
                    <p className="mt-0.5 text-xs text-sky-300">طرح انتخابی: {line.planTitle}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-mr-muted tabular-nums">
                    {formatStoreMoney(line.unitPrice, pricing.currency)} × {line.quantity}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <p className="font-semibold tabular-nums">
                    {formatStoreMoney(line.lineTotal, pricing.currency)}
                  </p>
                  <CartLineActions
                    productId={line.productId}
                    planId={line.planId}
                    quantity={line.quantity}
                  />
                </div>
              </article>
            ))}
            <aside className="card-shop space-y-2 p-6">
              <p className="flex justify-between gap-2 text-sm">
                <span className="text-mr-muted">جمع جزء</span>
                <span className="tabular-nums">{formatStoreMoney(pricing.subtotal, pricing.currency)}</span>
              </p>
              <p className="flex justify-between gap-2 text-lg font-bold">
                <span>قابل پرداخت</span>
                <span className="tabular-nums">{formatStoreMoney(pricing.total, pricing.currency)}</span>
              </p>
              <form action={goToCheckout} className="pt-2">
                <button
                  type="submit"
                  disabled={staleCount > 0}
                  className="w-full rounded-xl bg-mr-red py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
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