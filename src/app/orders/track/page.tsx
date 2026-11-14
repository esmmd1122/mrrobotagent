import { notFound } from 'next/navigation'
import { findOrderByCustomerAccess } from '@/modules/commerce/order-access'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { StartPaymentButton } from '@/components/orders/StartPaymentButton'
import { FulfillmentProgress } from '@/components/orders/FulfillmentProgress'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'
import { buildCustomerFileDownloadUrl, createFileDownloadGrant } from '@/modules/fulfillment/file-download'
import { formatStoreMoney } from '@/modules/commerce/pricing'

type Props = {
  searchParams: Promise<{ orderNumber?: string; token?: string; paid?: string }>
}

export default async function OrderTrackPage({ searchParams }: Props) {
  const { orderNumber, token, paid } = await searchParams
  if (!orderNumber || !token) notFound()

  const order = await findOrderByCustomerAccess(orderNumber, token)
  if (!order) notFound()

  const fulfillmentStatus = order.fulfillment?.status || order.fulfillmentStatus
  const deliveryText = order.fulfillment?.deliveryInfo || order.deliveryInfo
  const files = order.fulfillment?.files ?? []

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto max-w-lg px-4">
        <article className="card-shop space-y-4 p-6">
          <h1 className="text-xl font-bold">پیگیری سفارش {order.orderNumber}</h1>
          {paid === '1' ? (
            <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
              پرداخت در صورت تأیید سرور ثبت شده است.
            </p>
          ) : null}
          <p className="text-sm">
            وضعیت سفارش: <strong>{ORDER_STATUS_LABELS[order.status] || order.status}</strong>
          </p>
          <p className="text-sm">پرداخت: {order.paymentStatus}</p>

          <div>
            <p className="mb-2 text-sm font-medium">پیشرفت تحویل</p>
            <FulfillmentProgress current={fulfillmentStatus} />
            <p className="mt-2 text-xs text-mr-muted">
              {FULFILLMENT_STATUS_LABELS[fulfillmentStatus] || fulfillmentStatus}
            </p>
          </div>

          {order.paymentStatus !== 'PAID' ? (
            <StartPaymentButton orderNumber={order.orderNumber} viewToken={token} />
          ) : null}

          {deliveryText ? (
            <div className="rounded-lg border border-mr-border bg-mr-charcoal/80 p-4 text-sm">
              <p className="font-medium">اطلاعات تحویل</p>
              <p className="mt-2 whitespace-pre-wrap text-mr-muted">{deliveryText}</p>
            </div>
          ) : (
            <p className="text-xs text-mr-muted">هنوز اطلاعات تحویلی ثبت نشده است.</p>
          )}

          {files.length > 0 ? (
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
              <li key={i.id} className="flex justify-between py-1">
                <span>
                  {i.productName} × {i.quantity}
                </span>
                <span className="tabular-nums">{formatStoreMoney(i.lineTotal, order.currency)}</span>
              </li>
            ))}
          </ul>
          <p className="text-right font-bold tabular-nums">
            جمع: {formatStoreMoney(order.totalAmount, order.currency)}
          </p>
        </article>
      </div>
    </div>
  )
}