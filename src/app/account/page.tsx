import Link from 'next/link'
import { requireCustomer } from '@/lib/customer-auth/require-customer'
import { prisma } from '@/lib/db'
import { listOrdersForCustomer } from '@/modules/commerce/customer-order-access'
import { countUnreadNotifications, listCustomerNotifications } from '@/modules/notifications/service'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { AccountNav } from './AccountNav'
import { logoutAction } from './actions'

export default async function AccountDashboardPage() {
  const session = await requireCustomer()
  const [customer, orders, unread, notifications] = await Promise.all([
    prisma.customer.findUnique({ where: { id: session.sub } }),
    listOrdersForCustomer(session.sub, 5),
    countUnreadNotifications(session.sub),
    listCustomerNotifications(session.sub, 5),
  ])
  if (!customer) return null

  return (
    <div className="section-glow pt-24 pb-16">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">سلام، {customer.name}</h1>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-mr-muted underline">
              خروج
            </button>
          </form>
        </div>
        <AccountNav unread={unread} />

        {unread > 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            {unread} اعلان خوانده‌نشده دارید.{' '}
            <Link href="/account/notifications" className="text-mr-red">
              مشاهده
            </Link>
          </p>
        ) : null}

        <section className="card-shop p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">آخرین سفارش‌ها</h2>
            <Link href="/account/orders" className="text-xs text-mr-red">
              همه
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {orders.map((o) => (
              <li key={o.id} className="flex justify-between gap-2 border-t border-mr-border pt-2 first:border-0">
                <Link href={`/account/orders/${o.id}`} className="text-mr-red">
                  {o.orderNumber}
                </Link>
                <span>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
                <span className="tabular-nums">{o.totalAmount.toLocaleString('fa-IR')}</span>
              </li>
            ))}
            {orders.length === 0 ? <li className="text-mr-muted">هنوز سفارشی ندارید.</li> : null}
          </ul>
        </section>

        <section className="card-shop p-4">
          <h2 className="font-semibold">آخرین اعلان‌ها</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {notifications.map((n) => (
              <li key={n.id} className={n.readAt ? 'text-mr-muted' : ''}>
                <p className="font-medium">{n.title}</p>
                <p className="text-xs">{n.body}</p>
              </li>
            ))}
            {notifications.length === 0 ? <li className="text-mr-muted">اعلانی نیست.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  )
}