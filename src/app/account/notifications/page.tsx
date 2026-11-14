import Link from 'next/link'
import { requireCustomer } from '@/lib/customer-auth/require-customer'
import { countUnreadNotifications, listCustomerNotifications } from '@/modules/notifications/service'
import { AccountNav } from '../AccountNav'
import { markAllNotificationsReadAction } from '../actions'
import { MarkReadButton } from './MarkReadButton'

export default async function AccountNotificationsPage() {
  const session = await requireCustomer()
  const [notifications, unread] = await Promise.all([
    listCustomerNotifications(session.sub, 60),
    countUnreadNotifications(session.sub),
  ])

  return (
    <div className="section-glow pt-24 pb-16">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        <h1 className="text-xl font-bold">اعلان‌ها</h1>
        <AccountNav unread={unread} />
        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="text-sm text-mr-red">
              علامت‌گذاری همه به‌عنوان خوانده‌شده
            </button>
          </form>
        ) : null}
        <ul className="card-shop divide-y divide-mr-border">
          {notifications.map((n) => (
            <li key={n.id} className={`p-4 text-sm ${n.readAt ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="mt-1 text-mr-muted">{n.body}</p>
                  <p className="mt-2 text-xs text-mr-muted">
                    {new Date(n.createdAt).toLocaleString('fa-IR')}
                    {n.order?.orderNumber ? (
                      <>
                        {' · '}
                        {n.orderId ? (
                          <Link href={`/account/orders/${n.orderId}`} className="text-mr-red">
                            {n.order.orderNumber}
                          </Link>
                        ) : (
                          n.order.orderNumber
                        )}
                      </>
                    ) : null}
                  </p>
                </div>
                {!n.readAt ? <MarkReadButton notificationId={n.id} /> : null}
              </div>
            </li>
          ))}
          {notifications.length === 0 ? (
            <li className="p-4 text-mr-muted">اعلانی ثبت نشده است.</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}