import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS, ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: string
    paymentStatus?: string
    fulfillmentStatus?: string
    queue?: string
  }>
}) {
  await requireAdmin(PERMISSIONS.ORDERS_MANAGE)
  const sp = await searchParams
  const q = sp.q?.trim()
  const status = sp.status
  const paymentStatus = sp.paymentStatus
  const fulfillmentStatus = sp.fulfillmentStatus
  const pendingFulfillmentQueue = sp.queue === 'pending-fulfillment'
  const pendingPaymentQueue = sp.queue === 'pending-payment'

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
      ...(pendingFulfillmentQueue
        ? {
            paymentStatus: 'PAID',
            fulfillmentStatus: { in: ['PENDING', 'PROCESSING', 'WAITING_FOR_CUSTOMER'] },
          }
        : {}),
      ...(pendingPaymentQueue
        ? {
            paymentStatus: 'UNPAID',
            status: { in: ['PENDING_PAYMENT', 'PROCESSING'] },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q } },
              { customer: { name: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { customer: true, fulfillment: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">سفارش‌ها و تحویل</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/orders?queue=pending-fulfillment"
            className="rounded-lg border border-[#e32636]/40 px-3 py-1.5 text-sm text-[#e32636]"
          >
            صف تحویل
          </Link>
          <Link
            href="/admin/orders?queue=pending-payment"
            className="rounded-lg border border-amber-500/40 px-3 py-1.5 text-sm text-amber-300"
          >
            پرداخت معلق
          </Link>
        </div>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="جستجو..." className="admin-input max-w-xs" />
        <select name="status" defaultValue={status} className="admin-input max-w-[180px]">
          <option value="">وضعیت سفارش</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="paymentStatus" defaultValue={paymentStatus} className="admin-input max-w-[140px]">
          <option value="">پرداخت</option>
          {['UNPAID', 'PAID', 'FAILED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="fulfillmentStatus" defaultValue={fulfillmentStatus} className="admin-input max-w-[160px]">
          <option value="">تحویل</option>
          {Object.entries(FULFILLMENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-[#e10600] px-4 py-2 text-sm">فیلتر</button>
      </form>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full min-w-[820px]">
          <thead>
            <tr>
              <th>شماره</th>
              <th>مشتری</th>
              <th>سفارش</th>
              <th>پرداخت</th>
              <th>تحویل</th>
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
                <td>{FULFILLMENT_STATUS_LABELS[o.fulfillmentStatus] || o.fulfillmentStatus}</td>
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