import Link from 'next/link'
import {
  FileText,
  Package,
  Plus,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { getDashboardStats } from '@/lib/admin/stats'
import { DashboardChart } from '@/components/admin/DashboardChart'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { formatStoreMoney } from '@/modules/commerce/money'
import { prisma } from '@/lib/db'

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats()
  const productPerf = stats.topProducts.map((p) => ({
    name: p.productName,
    qty: p._sum.quantity ?? 0,
    revenue: p._sum.lineTotal ?? 0,
  }))

  const [businesses, appointments, aiCalls, activeSubs] = await Promise.all([
    prisma.salonBusiness.count(),
    prisma.salonBooking.count(),
    prisma.salonAiUsage.count(),
    prisma.salonSubscription.count({ where: { periodEnd: { gte: new Date() } } }),
  ])

  const cards = [
    { label: 'کل سفارش‌ها', value: stats.totalOrders.toLocaleString('fa-IR') },
    { label: 'سفارش‌های در انتظار', value: stats.pendingOrders.toLocaleString('fa-IR') },
    { label: 'سفارش‌های تکمیل‌شده', value: stats.completedOrders.toLocaleString('fa-IR') },
    { label: 'صف تحویل (پرداخت‌شده)', value: stats.pendingFulfillment.toLocaleString('fa-IR') },
    {
      label: 'کل محصولات فروشگاه',
      value: stats.totalProducts.toLocaleString('fa-IR'),
      sub: `${stats.activeProducts.toLocaleString('fa-IR')} محصول فعال در سایت`,
    },
    { label: 'مشتریان ثبت‌شده', value: stats.totalCustomers.toLocaleString('fa-IR') },
    { label: 'سفارش‌های پرداخت‌شده', value: stats.paidOrders.toLocaleString('fa-IR') },
    {
      label: 'درآمد واقعی (سفارش‌های پرداخت‌شده)',
      value: formatStoreMoney(stats.totalRevenue),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="admin-card relative overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mr-kicker">MR.ROBOT CONTROL</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              مرکز فرمان و مدیریت فروشگاه
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#9297A3]">
              تمامی آمارها مستقیماً از پایگاه‌داده واقعی محاسبه می‌شوند. مدیریت محصولات، سفارش‌ها، مشتریان و محتوای سایت از همین داشبورد در دسترس است.
            </p>

            {/* Quick Admin Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin/products/new"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#e10600] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-[#e10600]/25 transition hover:bg-[#c80500]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>افزودن محصول جدید</span>
              </Link>
              <Link
                href="/admin/appearance"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-[#e10600]/50"
              >
                <FileText className="h-3.5 w-3.5 text-[#ff5a56]" />
                <span>مدیریت محتوا (CMS)</span>
              </Link>
              <Link
                href="/admin/orders"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-white/30"
              >
                <ShoppingCart className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>مدیریت سفارش‌ها</span>
              </Link>
              <Link
                href="/admin/products"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-white/30"
              >
                <Package className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>فهرست محصولات</span>
              </Link>
              <Link
                href="/admin/customers"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-white/30"
              >
                <Users className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>مشتریان</span>
              </Link>
            </div>
          </div>
          <img
            src="/images/mr-robot-character.png"
            alt="MR.ROBOT"
            className="mr-float hidden h-24 w-24 object-contain sm:block"
          />
        </div>
      </section>

      {/* Primary E-Commerce KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} sub={c.sub} />
        ))}
      </div>

      {/* Platform / Salon KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="سالن‌ها" value={businesses.toLocaleString('fa-IR')} />
        <StatCard label="اشتراک فعال سالن" value={activeSubs.toLocaleString('fa-IR')} />
        <StatCard label="نوبت‌های ثبت‌شده" value={appointments.toLocaleString('fa-IR')} />
        <StatCard label="فراخوانی AI" value={aiCalls.toLocaleString('fa-IR')} />
      </div>

      <section className="admin-card p-5">
        <h2 className="font-semibold">تحلیل سفارش و درآمد ۳۰ روز اخیر</h2>
        <DashboardChart data={stats.chart} />
      </section>

      {productPerf.length > 0 ? (
        <section className="admin-card overflow-x-auto p-4">
          <h2 className="mb-3 font-semibold">عملکرد محصولات (بر اساس آیتم‌های سفارش)</h2>
          <table className="admin-table w-full min-w-[460px] text-sm">
            <thead>
              <tr>
                <th>محصول</th>
                <th>تعداد</th>
                <th>مجموع خط</th>
              </tr>
            </thead>
            <tbody>
              {productPerf.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td className="tabular-nums">{p.qty.toLocaleString('fa-IR')}</td>
                  <td className="tabular-nums">{formatStoreMoney(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <TwoColumnSection
        leftTitle="آخرین سفارش‌ها"
        left={
          stats.recentOrders.length === 0 ? (
            <EmptyRow text="هنوز سفارشی ثبت نشده است." />
          ) : (
            <table className="admin-table w-full min-w-[480px]">
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
                      <Link href={`/admin/orders/${o.id}`} className="font-mono text-[#e10600]" dir="ltr">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td>{o.customer.name}</td>
                    <td>{ORDER_STATUS_LABELS[o.status] || o.status}</td>
                    <td className="tabular-nums">{formatStoreMoney(o.totalAmount, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
        rightTitle="فعالیت‌های اخیر مدیریت"
        right={
          stats.recentActivity.length === 0 ? (
            <EmptyRow text="لاگ فعالیتی ثبت نشده است." />
          ) : (
            <ul className="space-y-2 text-sm">
              {stats.recentActivity.map((a) => (
                <li key={a.id} className="rounded-lg border border-[#2a2b35]/80 px-3 py-2">
                  <p className="font-medium text-white/90">{a.action}</p>
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

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="admin-card p-4">
      <p className="text-xs text-[#9297A3]">{label}</p>
      <p className="mr-metric mt-2 tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-white/50">{sub}</p> : null}
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
