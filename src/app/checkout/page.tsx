import Link from 'next/link'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { readCart } from '@/modules/commerce/cart-cookie'
import { formatStoreMoney, validateCheckoutPricing } from '@/modules/commerce/pricing'
import { resolveStorefrontErrorMessage } from '@/modules/commerce/error-messages'
import { getPaymentGatewayAvailability } from '@/modules/payment/registry'
import { CheckoutForm } from './CheckoutForm'

type Props = { searchParams: Promise<{ error?: string }> }

export default async function CheckoutPage({ searchParams }: Props) {
  const lines = await readCart()
  const rawError = (await searchParams).error
  const errorMessage = resolveStorefrontErrorMessage(rawError)

  const checkout = await validateCheckoutPricing(lines)
  if (!checkout.ok) {
    return (
      <div className="section-glow pt-24 pb-20 text-center">
        <div className="mx-auto max-w-md px-4">
          <div className="card-shop p-8">
            <p className="text-mr-muted">{checkout.error}</p>
            <Link href="/cart" className="mt-4 inline-block text-mr-red underline">
              بازگشت به سبد خرید
            </Link>
          </div>
        </div>
      </div>
    )
  }
  const pricing = checkout.pricing

  if (pricing.lines.length === 0) {
    return (
      <div className="section-glow pt-24 pb-20 text-center">
        <p className="text-mr-muted">سبد خرید خالی است.</p>
        <Link href="/shop" className="mt-4 inline-block text-mr-red underline">
          مشاهده فروشگاه
        </Link>
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

  const idempotencyKey = randomUUID()

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 lg:grid-cols-2">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">تسویه‌حساب</h1>
          <p className="mt-2 text-sm text-mr-muted">
            {gateway.available
              ? 'سفارش با وضعیت «در انتظار پرداخت» ثبت می‌شود و سپس به درگاه پرداخت هدایت می‌شوید.'
              : 'سفارش شما با وضعیت «در انتظار پرداخت» در سامانه ثبت می‌شود و کد پیگیری اختصاصی دریافت می‌کنید.'}
          </p>
          {errorMessage ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}
          <CheckoutForm
            idempotencyKey={idempotencyKey}
            defaultName={customer?.name}
            defaultEmail={customer?.email ?? undefined}
            defaultPhone={customer?.phone ?? undefined}
            onlinePaymentAvailable={gateway.available}
            subtotal={pricing.subtotal}
            currency={pricing.currency}
          />
        </div>
        <aside className="card-shop h-fit space-y-4 p-6">
          <h2 className="font-semibold">خلاصه سفارش</h2>
          <ul className="space-y-3 text-sm">
            {pricing.lines.map((l) => (
              <li
                key={`${l.productId}:${l.planId ?? ''}`}
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">{l.productName}</p>
                  {l.planTitle ? <p className="text-xs text-sky-300">{l.planTitle}</p> : null}
                  <p className="text-xs text-mr-muted tabular-nums">
                    {formatStoreMoney(l.unitPrice, pricing.currency)} × {l.quantity}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatStoreMoney(l.lineTotal, pricing.currency)}
                </span>
              </li>
            ))}
          </ul>
          <hr className="border-mr-border" />
          <p className="flex justify-between gap-2 text-sm">
            <span className="text-mr-muted">جمع جزء</span>
            <span className="tabular-nums">{formatStoreMoney(pricing.subtotal, pricing.currency)}</span>
          </p>
          <p className="flex justify-between gap-2 text-lg font-bold">
            <span>مبلغ نهایی</span>
            <span className="tabular-nums">{formatStoreMoney(pricing.total, pricing.currency)}</span>
          </p>
        </aside>
      </div>
    </div>
  )
}