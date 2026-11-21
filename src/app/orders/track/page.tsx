import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findOrderByCustomerAccess } from '@/modules/commerce/order-access'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { StartPaymentButton } from '@/components/orders/StartPaymentButton'
import { FulfillmentProgress } from '@/components/orders/FulfillmentProgress'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'
import { buildCustomerFileDownloadUrl, createFileDownloadGrant } from '@/modules/fulfillment/file-download'
import { formatStoreMoney } from '@/modules/commerce/pricing'
import { getPaymentGatewayAvailability } from '@/modules/payment/registry'
import { paymentStatusLabelFa } from '@/modules/payment/labels'

type Props = {
  searchParams: Promise<{ orderNumber?: string; token?: string; paid?: string }>
}

export default async function OrderTrackPage({ searchParams }: Props) {
  const { orderNumber, token, paid } = await searchParams
  if (!orderNumber || !token) {
    return (
      <div className="section-glow pt-24 pb-20">
        <div className="mx-auto max-w-lg px-4">
          <article className="card-shop space-y-4 p-6 text-center">
            <h1 className="text-xl font-bold">پیگیری سفارش</h1>
            <p className="text-sm leading-relaxed text-mr-muted">
              برای مشاهده وضعیت سفارش مهمان، از لینک اختصاصی پیگیری که پس از ثبت سفارش نمایش داده شده استفاده کنید. اگر با حساب کاربری سفارش داده‌اید، از بخش سفارش‌های حساب من وارد شوید.
            </p>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
              <Link
                href="/account/orders"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-mr-red px-5 py-2 text-sm font-semibold text-white"
              >
                سفارش‌های حساب من
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-mr-border px-5 py-2 text-sm text-white/90 hover:bg-white/5"
              >
                تماس با پشتیبانی
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

  const fulfillmentStatus = order.fulfillment?.status || order.fulfillmentStatus
  const deliveryText = order.fulfillment?.deliveryInfo || order.deliveryInfo
  const files = order.fulfillment?.files ?? []
  const isUnpaid = order.paymentStatus !== 'PAID'

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto max-w-lg px-4">
        <article className="card-shop space-y-4 p-6">
          <h1 className="text-xl font-bold">
            پیگیری سفارش{' '}
            <span dir="ltr" className="inline-block font-mono">
              {order.orderNumber}
            </span>
          </h1>
          {paid === '1' ? (
            <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
              پرداخت در صورت تأیید سرور ثبت شده است.
            </p>
          ) : null}
          <div className="space-y-1 text-sm">
            <p>
              وضعیت سفارش: <strong>{ORDER_STATUS_LABELS[order.status] || order.status}</strong>
            </p>
            <p>
              وضعیت پرداخت: <strong>{paymentStatusLabelFa(order.paymentStatus)}</strong>
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">پیشرفت تحویل</p>
            <FulfillmentProgress current={fulfillmentStatus} />
            <p className="mt-2 text-xs text-mr-muted">
              {FULFILLMENT_STATUS_LABELS[fulfillmentStatus] || fulfillmentStatus}
            </p>
          </div>

          {isUnpaid && gateway.available ? (
            <StartPaymentButton orderNumber={order.orderNumber} viewToken={token} />
          ) : null}

          {isUnpaid && !gateway.available ? (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100">
              <p className="font-semibold text-amber-200">درگاه پرداخت آنلاین فعلاً غیرفعال است</p>
              <p className="mt-1">
                برای هماهنگی پرداخت و فعال‌سازی این سفارش با پشتیبانی MR.ROBOT تماس بگیرید و شماره سفارش{' '}
                <span dir="ltr" className="font-mono font-semibold text-white">
                  {order.orderNumber}
                </span>{' '}
                را ارسال کنید.
              </p>
              <Link
                href={`/contact?subject=${encodeURIComponent(`هماهنگی پرداخت سفارش ${order.orderNumber}`)}`}
                className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-mr-red px-4 py-2 text-xs font-semibold text-white"
              >
                ارتباط با پشتیبانی
              </Link>
            </div>
          ) : null}

          {deliveryText ? (
            <div className="rounded-lg border border-mr-border bg-mr-charcoal/80 p-4 text-sm">
              <p className="font-medium">اطلاعات تحویل</p>
              <p className="mt-2 whitespace-pre-wrap text-mr-muted">{deliveryText}</p>
            </div>
          ) : (
            <p className="text-xs text-mr-muted">هنوز اطلاعات تحویلی ثبت نشده است.</p>
          )}

          {files.length > 0 && order.paymentStatus === 'PAID' ? (
            <div className="rounded-lg border border-mr-border p-4 text-sm">
              <p className="font-medium">فایل‌های تحویل</p>
              <ul className="mt-2 space-y-1">
                {files.map((f) => {
                  const grant = createFileDownloadGrant(f.id, order.orderNumber, token)
                  const href = buildCustomerFileDownloadUrl(f.id, order.orderNumber, token, grant)
                  return (
                    <li key={f.id}>
                      <a href={href} className="text-mr-red underline">
                        {f.filename}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          <ul className="border-t border-mr-border pt-4 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-2 py-1">
                <span className="min-w-0 break-words">
                  {i.productName}
                  {i.planTitle ? ` — ${i.planTitle}` : ''} × {i.quantity}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatStoreMoney(i.lineTotal, order.currency)}
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
          <p className="text-right font-bold tabular-nums">
            جمع نهایی: {formatStoreMoney(order.totalAmount, order.currency)}
          </p>
        </article>
      </div>
    </div>
  )
}