import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireCustomer } from '@/lib/customer-auth/require-customer'
import {
  assertNoInternalFields,
  findOrderForCustomerById,
} from '@/modules/commerce/customer-order-access'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { FulfillmentProgress } from '@/components/orders/FulfillmentProgress'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'
import {
  buildSessionFileDownloadUrl,
  createFileDownloadGrantForCustomer,
} from '@/modules/fulfillment/file-download'
import { AccountNav } from '../../AccountNav'
import { formatStoreMoney } from '@/modules/commerce/pricing'
import { countUnreadNotifications } from '@/modules/notifications/service'
import { AccountStartPaymentButton } from '@/components/orders/AccountStartPaymentButton'

type Props = { params: Promise<{ id: string }> }

export default async function AccountOrderDetailPage({ params }: Props) {
  const session = await requireCustomer()
  const { id } = await params
  const order = await findOrderForCustomerById(session.sub, id)
  if (!order) notFound()

  assertNoInternalFields(order as unknown as Record<string, unknown>)

  const unread = await countUnreadNotifications(session.sub)
  const fulfillmentStatus = order.fulfillment?.status || order.fulfillmentStatus
  const deliveryText = order.fulfillment?.deliveryInfo || order.deliveryInfo
  const files = order.fulfillment?.files ?? []

  return (
    <div className="section-glow pt-24 pb-16">
      <div className="mx-auto max-w-lg space-y-6 px-4">
        <Link href="/account/orders" className="text-sm text-mr-muted">
          ← بازگشت
        </Link>
        <h1 className="text-xl font-bold">سفارش {order.orderNumber}</h1>
        <AccountNav unread={unread} />

        <article className="card-shop space-y-4 p-6">
          <p className="text-sm">
            وضعیت: <strong>{ORDER_STATUS_LABELS[order.status] || order.status}</strong>
          </p>
          <p className="text-sm">پرداخت: {order.paymentStatus}</p>
          <FulfillmentProgress current={fulfillmentStatus} />
          <p className="text-xs text-mr-muted">
            {FULFILLMENT_STATUS_LABELS[fulfillmentStatus] || fulfillmentStatus}
          </p>

          {order.paymentStatus !== 'PAID' ? <AccountStartPaymentButton orderNumber={order.orderNumber} /> : null}

          {deliveryText ? (
            <div className="rounded-lg border border-mr-border p-3 text-sm">
              <p className="font-medium">اطلاعات تحویل</p>
              <p className="mt-1 whitespace-pre-wrap text-mr-muted">{deliveryText}</p>
            </div>
          ) : null}

          {order.fulfillment?.failureReason ? (
            <p className="text-sm text-red-300">مشکل تحویل: {order.fulfillment.failureReason}</p>
          ) : null}

          {files.length > 0 && order.paymentStatus === 'PAID' ? (
            <div className="text-sm">
              <p className="font-medium">فایل‌های تحویل</p>
              <ul className="mt-2 space-y-1">
                {files.map((f) => {
                  const grant = createFileDownloadGrantForCustomer(f.id, order.orderNumber, session.sub)
                  const href = buildSessionFileDownloadUrl(f.id, order.orderNumber, session.sub, grant)
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
                  {i.productName}
                  {i.planTitle ? ` — ${i.planTitle}` : ''} × {i.quantity}
                </span>
                <span className="tabular-nums">{formatStoreMoney(i.lineTotal, order.currency)}</span>
              </li>
            ))}
          </ul>
          {order.payments.length > 0 ? (
            <div className="border-t border-mr-border pt-3 text-xs text-mr-muted">
              <p className="font-medium text-white/80">پرداخت‌ها</p>
              <ul className="mt-1 space-y-1">
                {order.payments.map((p) => (
                  <li key={p.id}>
                    {p.provider} — {p.status} — {p.amount.toLocaleString('fa-IR')}{' '}
                    {p.verifiedAt ? new Date(p.verifiedAt).toLocaleString('fa-IR') : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-right font-bold tabular-nums">
            جمع: {formatStoreMoney(order.totalAmount, order.currency)}
          </p>
        </article>
      </div>
    </div>
  )
}