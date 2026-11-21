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
import { getPaymentGatewayAvailability } from '@/modules/payment/registry'
import {
  paymentProviderLabelFa,
  paymentStatusLabelFa,
  paymentTxStatusLabelFa,
} from '@/modules/payment/labels'

type Props = { params: Promise<{ id: string }> }

export default async function AccountOrderDetailPage({ params }: Props) {
  const session = await requireCustomer()
  const { id } = await params
  const [order, gateway] = await Promise.all([
    findOrderForCustomerById(session.sub, id),
    getPaymentGatewayAvailability(),
  ])
  if (!order) notFound()

  assertNoInternalFields(order as unknown as Record<string, unknown>)

  const unread = await countUnreadNotifications(session.sub)
  const fulfillmentStatus = order.fulfillment?.status || order.fulfillmentStatus
  const deliveryText = order.fulfillment?.deliveryInfo || order.deliveryInfo
  const files = order.fulfillment?.files ?? []
  const isUnpaid = order.paymentStatus !== 'PAID'

  return (
    <div className="section-glow pt-24 pb-16">
      <div className="mx-auto max-w-lg space-y-6 px-4">
        <Link href="/account/orders" className="text-sm text-mr-muted hover:text-white">
          ← بازگشت به سفارش‌ها
        </Link>
        <h1 className="text-xl font-bold">
          سفارش{' '}
          <span dir="ltr" className="inline-block font-mono">
            {order.orderNumber}
          </span>
        </h1>
        <AccountNav unread={unread} />

        <article className="card-shop space-y-4 p-6">
          <p className="text-sm">
            وضعیت سفارش: <strong>{ORDER_STATUS_LABELS[order.status] || order.status}</strong>
          </p>
          <p className="text-sm">
            وضعیت پرداخت: <strong>{paymentStatusLabelFa(order.paymentStatus)}</strong>
          </p>
          <FulfillmentProgress current={fulfillmentStatus} />
          <p className="text-xs text-mr-muted">
            {FULFILLMENT_STATUS_LABELS[fulfillmentStatus] || fulfillmentStatus}
          </p>

          {isUnpaid && gateway.available ? (
            <AccountStartPaymentButton orderNumber={order.orderNumber} />
          ) : null}

          {isUnpaid && !gateway.available ? (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100">
              <p className="font-semibold text-amber-200">درگاه پرداخت آنلاین فعلاً غیرفعال است</p>
              <p className="mt-1">
                برای هماهنگی پرداخت و فعال‌سازی این سفارش با پشتیبانی MR.ROBOT در ارتباط باشید.
              </p>
              <Link
                href={`/contact?subject=${encodeURIComponent(`هماهنگی پرداخت سفارش ${order.orderNumber}`)}`}
                className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-mr-red px-4 py-2 text-xs font-semibold text-white"
              >
                تماس با پشتیبانی
              </Link>
            </div>
          ) : null}

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
          {order.payments.length > 0 ? (
            <div className="border-t border-mr-border pt-3 text-xs text-mr-muted">
              <p className="font-medium text-white/80">تراکنش‌های پرداخت</p>
              <ul className="mt-1 space-y-1">
                {order.payments.map((p) => (
                  <li key={p.id}>
                    {paymentProviderLabelFa(p.provider)} — {paymentTxStatusLabelFa(p.status)} —{' '}
                    {formatStoreMoney(p.amount, p.currency)}{' '}
                    {p.verifiedAt ? new Date(p.verifiedAt).toLocaleString('fa-IR') : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-right font-bold tabular-nums">
            جمع نهایی: {formatStoreMoney(order.totalAmount, order.currency)}
          </p>
        </article>
      </div>
    </div>
  )
}