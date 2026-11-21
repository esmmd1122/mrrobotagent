import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findOrderByCustomerAccess } from '@/modules/commerce/order-access'
import { formatStoreMoney } from '@/modules/commerce/pricing'
import { safeDecodeParam } from '@/modules/commerce/error-messages'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { getPaymentGatewayAvailability } from '@/modules/payment/registry'
import { paymentStatusLabelFa } from '@/modules/payment/labels'
import { StartPaymentButton } from '@/components/orders/StartPaymentButton'
import { CartSyncOnMount } from '@/components/cart/CartSyncOnMount'

type Props = {
  searchParams: Promise<{
    orderNumber?: string
    token?: string
    paymentMode?: string
    payError?: string
    payMsg?: string
  }>
}

export default async function OrderConfirmationPage({ searchParams }: Props) {
  const { orderNumber, token, paymentMode, payError, payMsg } = await searchParams
  if (!orderNumber || !token) {
    return (
      <div className="section-glow pt-24 pb-20">
        <div className="mx-auto max-w-lg px-4">
          <article className="card-shop space-y-4 p-6 text-center">
            <h1 className="text-xl font-bold">رسید ثبت سفارش</h1>
            <p className="text-sm leading-relaxed text-mr-muted">
              لینک رسید سفارش ناقص است. برای مشاهده سفارش‌های خود وارد حساب کاربری شوید یا از لینک اختصاصی پس از ثبت سفارش استفاده کنید.
            </p>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
              <Link
                href="/account/orders"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-mr-red px-5 py-2 text-sm font-semibold text-white"
              >
                مشاهده سفارش‌های من
              </Link>
              <Link
                href="/shop"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-mr-border px-5 py-2 text-sm text-white/90 hover:bg-white/5"
              >
                بازگشت به فروشگاه
              </Link>
            </div>
          </article>
        </div>
      </div>
    )
  }

  const [order, gateway] = await Promise.all([
    findOrderByCustomerAccess(orderNumber, token),
    getPaymentGatewayAvailability(),
  ])
  if (!order) notFound()

  const decodedPayMsg = safeDecodeParam(payMsg)
  const isUnpaid = order.paymentStatus !== 'PAID'
  const showGatewayError =
    Boolean(payError) && payError !== 'NO_GATEWAY' && paymentMode !== 'offline' && gateway.available
  const supportSubject = `هماهنگی پرداخت سفارش ${order.orderNumber}`
  const trackHref = `/orders/track?orderNumber=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(token)}`

  return (
    <div className="section-glow pt-24 pb-20">
      <CartSyncOnMount />
      <div className="mx-auto max-w-xl px-4">
        <article className="card-shop space-y-5 p-6 sm:p-8">
          <div className="text-center">
            <p className="text-xs tracking-widest text-mr-red">ORDER PLACED</p>
            <h1 className="mt-2 text-2xl font-bold">سفارش شما با موفقیت ثبت شد</h1>
            <p className="mt-2 text-sm text-mr-muted">شماره پیگیری سفارش:</p>
            <p
              className="mt-1 inline-block rounded-lg border border-mr-border bg-mr-charcoal px-4 py-1.5 text-lg font-bold tracking-wide tabular-nums"
              dir="ltr"
            >
              {order.orderNumber}
            </p>
          </div>

          <div className="grid gap-2 rounded-xl border border-mr-border bg-mr-charcoal/50 p-4 text-sm sm:grid-cols-2">
            <p>
              <span className="text-mr-muted">وضعیت سفارش: </span>
              <strong>{ORDER_STATUS_LABELS[order.status] || order.status}</strong>
            </p>
            <p>
              <span className="text-mr-muted">وضعیت پرداخت: </span>
              <strong>{paymentStatusLabelFa(order.paymentStatus)}</strong>
            </p>
            <p className="sm:col-span-2">
              <span className="text-mr-muted">مبلغ قابل پرداخت: </span>
              <strong className="tabular-nums text-white">
                {formatStoreMoney(order.totalAmount, order.currency)}
              </strong>
            </p>
          </div>

          <div className="space-y-2 border-t border-mr-border pt-4 text-sm">
            <h2 className="font-semibold text-white/90">اقلام سفارش</h2>
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium">
                      {item.productName}
                      {item.planTitle ? ` — ${item.planTitle}` : ''}
                    </p>
                    <p className="text-xs text-mr-muted tabular-nums">
                      تعداد: {item.quantity.toLocaleString('fa-IR')}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums">
                    {formatStoreMoney(item.lineTotal, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
            {order.discountAmount > 0 ? (
              <p className="flex justify-between text-xs text-emerald-300">
                <span>تخفیف {order.discountCode ? `(${order.discountCode})` : ''}</span>
                <span className="tabular-nums">
                  − {formatStoreMoney(order.discountAmount, order.currency)}
                </span>
              </p>
            ) : null}
          </div>

          {showGatewayError ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              انتقال خودکار به درگاه پرداخت انجام نشد
              {decodedPayMsg ? ` (${decodedPayMsg})` : ''}. سفارش شما ثبت شده و می‌توانید دوباره تلاش کنید.
            </p>
          ) : null}

          {isUnpaid && !gateway.available ? (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
              <p className="font-semibold text-amber-200">
                پرداخت آنلاین در حال حاضر غیرفعال است
              </p>
              <p className="mt-1.5 text-xs text-amber-100/90">
                سفارش شما با وضعیت «در انتظار پرداخت» در سیستم ذخیره شده است و هیچ پرداختی انجام نشده است.
                برای هماهنگی پرداخت دستی و فعال‌سازی سرویس، با پشتیبانی MR.ROBOT در ارتباط باشید و شماره سفارش{' '}
                <span dir="ltr" className="font-mono font-semibold text-white">
                  {order.orderNumber}
                </span>{' '}
                را اعلام کنید.
              </p>
              <Link
                href={`/contact?subject=${encodeURIComponent(supportSubject)}`}
                className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center rounded-xl bg-mr-red px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                تماس با پشتیبانی برای هماهنگی پرداخت
              </Link>
            </div>
          ) : null}

          {isUnpaid && gateway.available ? (
            <StartPaymentButton orderNumber={order.orderNumber} viewToken={token} />
          ) : null}

          <div className="flex flex-col gap-2 border-t border-mr-border pt-4 text-center sm:flex-row sm:justify-between">
            <Link
              href={trackHref}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-xl border border-mr-border px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              مشاهده صفحه پیگیری سفارش
            </Link>
            <Link
              href="/shop"
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-mr-border px-4 py-2 text-sm text-mr-muted transition hover:bg-white/5 hover:text-white"
            >
              بازگشت به فروشگاه
            </Link>
          </div>

          <p className="text-center text-xs text-mr-muted">
            لطفاً لینک این صفحه یا صفحه پیگیری را نزد خود نگه دارید؛ برای مشاهده وضعیت سفارش مهمان به توکن اختصاصی این لینک نیاز است.
          </p>
        </article>
      </div>
    </div>
  )
}