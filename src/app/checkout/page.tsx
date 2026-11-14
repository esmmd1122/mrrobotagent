import Link from 'next/link'
import { readCart } from '@/modules/commerce/cart-cookie'
import { formatStoreMoney, validateCheckoutPricing } from '@/modules/commerce/pricing'
import { CheckoutForm } from './CheckoutForm'
import { randomUUID } from 'crypto'

type Props = { searchParams: Promise<{ error?: string }> }

export default async function CheckoutPage({ searchParams }: Props) {
  const lines = await readCart()
  const error = (await searchParams).error
  const checkout = await validateCheckoutPricing(lines)
  if (!checkout.ok) {
    return (
      <div className="section-glow pt-24 pb-20 text-center">
        <p className="text-mr-muted">{checkout.error}</p>
        <Link href="/cart" className="mt-4 inline-block text-mr-red underline">
          بازگشت به سبد
        </Link>
      </div>
    )
  }
  const pricing = checkout.pricing

  if (pricing.lines.length === 0) {
    return (
      <div className="section-glow pt-24 pb-20 text-center">
        <p className="text-mr-muted">سبد خالی است.</p>
        <Link href="/shop" className="mt-4 inline-block text-mr-red underline">
          فروشگاه
        </Link>
      </div>
    )
  }

  const idempotencyKey = randomUUID()

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold">تسویه‌حساب</h1>
          <p className="mt-2 text-sm text-mr-muted">
            سفارش با وضعیت «در انتظار پرداخت» ثبت می‌شود؛ سپس به درگاه پرداخت پیکربندی‌شده هدایت می‌شوید.
          </p>
          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {decodeURIComponent(error)}
            </p>
          ) : null}
          <CheckoutForm idempotencyKey={idempotencyKey} />
        </div>
        <aside className="card-shop h-fit space-y-4 p-6">
          <h2 className="font-semibold">خلاصه سفارش</h2>
          <ul className="space-y-2 text-sm">
            {pricing.lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-2">
                <span>
                  {l.name} × {l.quantity}
                </span>
                <span className="tabular-nums">{formatStoreMoney(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <hr className="border-mr-border" />
          <p className="flex justify-between text-sm">
            <span className="text-mr-muted">جمع</span>
            <span>{formatStoreMoney(pricing.subtotal)}</span>
          </p>
          <p className="flex justify-between text-lg font-bold">
            <span>مبلغ نهایی</span>
            <span className="tabular-nums">{formatStoreMoney(pricing.total)}</span>
          </p>
        </aside>
      </div>
    </div>
  )
}