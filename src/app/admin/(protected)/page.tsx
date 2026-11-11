import { getDashboardStats } from '@/lib/admin/stats'
import { DashboardChart } from '@/components/admin/DashboardChart'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats()

  const cards = [
    { label: 'کل سفارش‌ها', value: stats.totalOrders },
    { label: 'در انتظار / پردازش', value: stats.pendingOrders },
    { label: 'تکمیل‌شده', value: stats.completedOrders },
    { label: 'مشتریان', value: stats.totalCustomers },
    { label: 'محصولات فعال', value: stats.totalProducts },
    {
      label: 'درآمد پرداخت‌شده',
      value: stats.totalRevenue.toLocaleString('fa-IR'),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <section className="admin-card p-5">
        <h2 className="font-semibold">تحلیل ۳۰ روز اخیر</h2>
        <DashboardChart data={stats.chart} />
      </section>

      <TwoColumnSection
        leftTitle="آخرین سفارش‌ها"
        left={
          stats.recentOrders.length === 0 ? (
            <EmptyRow text="سفارشی ثبت نشده." />
          ) : (
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>شماره</th>
                  <th>مشتری</th>
                  <th>وضعیت</th>
                  <th>مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="text-[#e10600]">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td>{o.customer.name}</td>
                    <td>{ORDER_STATUS_LABELS[o.status] || o.status}</td>
                    <td>{o.totalAmount.toLocaleString('fa-IR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
        rightTitle="فعالیت اخیر"
        right={
          stats.recentActivity.length === 0 ? (
            <EmptyRow text="لاگ فعالیتی وجود ندارد." />
          ) : (
            <ul className="space-y-2 text-sm">
              {stats.recentActivity.map((a) => (
                <li key={a.id} className="rounded-lg border border-[#2a2b35]/80 px-3 py-2">
                  <p className="font-medium">{a.action}</p>
                  <p className="text-xs text-white/45">
                    {a.admin?.name || 'سیستم'} —{' '}
                    {new Date(a.createdAt).toLocaleString('fa-IR')}
                  </p>
                </li>
              ))}
            </ul>
          )
        }
      />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="admin-card p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

function TwoColumnSection(props: {
  leftTitle: string
  left: React.ReactNode
  rightTitle: string
  right: React.ReactNode
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="admin-card overflow-x-auto p-4">
        <h2 className="mb-3 font-semibold">{props.leftTitle}</h2>
        {props.left}
      </section>
      <section className="admin-card p-4">
        <h2 className="mb-3 font-semibold">{props.rightTitle}</h2>
        {props.right}
      </section>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-sm text-white/50">{text}</p>
}
