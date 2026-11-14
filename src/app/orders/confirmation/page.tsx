import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findOrderByCustomerAccess } from '@/modules/commerce/order-access'
import { StartPaymentButton } from '@/components/orders/StartPaymentButton'
import { formatStoreMoney } from '@/modules/commerce/pricing'

type Props = {
  searchParams: Promise<{ orderNumber?: string; token?: string; payError?: string; payMsg?: string }>
}

export default async function OrderConfirmationPage({ searchParams }: Props) {
  const { orderNumber, token, payError, payMsg } = await searchParams
  if (!orderNumber || !token) notFound()

  const order = await findOrderByCustomerAccess(orderNumber, token)
  if (!order) notFound()

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto max-w-lg px-4">
        <article className="card-shop p-8 text-center">
          <p className="text-xs tracking-widest text-mr-red">ORDER PLACED</p>
          <h1 className="mt-2 text-2xl font-bold">سفارش ثبت شد</h1>
          <p className="mt-2 text-mr-muted">شماره پیگیری:</p>
          <p className="mt-1 text-xl font-semibold tabular-nums" dir="ltr">
            {order.orderNumber}
          </p>
          <p className="mt-6 text-sm text-white/80">
            وضعیت پرداخت: <strong>{order.paymentStatus}</strong> — مبلغ{' '}
            <strong className="tabular-nums">{formatStoreMoney(order.totalAmount, order.currency)}</strong>
          </p>
          <p className="mt-3 text-xs text-mr-muted">
            لینک این صفحه را نگه دارید؛ برای پیگیری به توکن دسترسی نیاز دارید.
          </p>
          {payError ? (
            <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              درگاه در دسترس نبود ({payError}
              {payMsg ? ` — ${payMsg.includes('%') ? decodeURIComponent(payMsg) : payMsg}` : ''}). می‌توانید دوباره
              تلاش کنید.
            </p>
          ) : null}
          {order.paymentStatus !== 'PAID' ? (
            <StartPaymentButton orderNumber={order.orderNumber} viewToken={token} />
          ) : null}
          <Link
            href={`/orders/track?orderNumber=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(token)}`}
            className="mt-4 inline-block text-sm text-mr-red underline"
          >
            پیگیری سفارش
          </Link>
        </article>
      </div>
    </div>
  )
}