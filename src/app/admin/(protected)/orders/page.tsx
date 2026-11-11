import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS, ORDER_STATUS_LABELS } from '@/lib/auth/constants'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  await requireAdmin(PERMISSIONS.ORDERS_MANAGE)
  const sp = await searchParams
  const q = sp.q?.trim()
  const status = sp.status

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q } },
              { customer: { name: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">سفارش‌ها</h1>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="جستجو..." className="admin-input max-w-xs" />
        <select name="status" defaultValue={status} className="admin-input max-w-[200px]">
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-[#e10600] px-4 py-2 text-sm">فیلتر</button>
      </form>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full min-w-[700px]">
          <thead>
            <tr>
              <th>شماره</th>
              <th>مشتری</th>
              <th>وضعیت</th>
              <th>پرداخت</th>
              <th>مبلغ</th>
              <th>تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`} className="text-[#e10600]">
                    {o.orderNumber}
                  </Link>
                </td>
                <td>{o.customer.name}</td>
                <td>{ORDER_STATUS_LABELS[o.status] || o.status}</td>
                <td>{o.paymentStatus}</td>
                <td>{o.totalAmount.toLocaleString('fa-IR')}</td>
                <td>{new Date(o.createdAt).toLocaleDateString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 ? (
          <p className="p-4 text-sm text-white/50">سفارشی یافت نشد.</p>
        ) : null}
      </div>
    </div>
  )
}
