import Link from 'next/link'
import { requireCustomer } from '@/lib/customer-auth/require-customer'
import { listOrdersForCustomer } from '@/modules/commerce/customer-order-access'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'
import { AccountNav } from '../AccountNav'
import { countUnreadNotifications } from '@/modules/notifications/service'

export default async function AccountOrdersPage() {
  const session = await requireCustomer()
  const [orders, unread] = await Promise.all([
    listOrdersForCustomer(session.sub, 50),
    countUnreadNotifications(session.sub),
  ])

  return (
    <div className="section-glow pt-24 pb-16">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <h1 className="text-xl font-bold">تاریخچه سفارش‌ها</h1>
        <AccountNav unread={unread} />
        <div className="card-shop overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-mr-border text-right text-mr-muted">
                <th className="py-2">شماره</th>
                <th>وضعیت</th>
                <th>پرداخت</th>
                <th>تحویل</th>
                <th>مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-mr-border/50">
                  <td className="py-2">
                    <Link href={`/account/orders/${o.id}`} className="text-mr-red">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td>{ORDER_STATUS_LABELS[o.status] || o.status}</td>
                  <td>{o.paymentStatus}</td>
                  <td>{FULFILLMENT_STATUS_LABELS[o.fulfillmentStatus] || o.fulfillmentStatus}</td>
                  <td className="tabular-nums">{o.totalAmount.toLocaleString('fa-IR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 ? <p className="p-4 text-mr-muted">سفارشی یافت نشد.</p> : null}
        </div>
      </div>
    </div>
  )
}