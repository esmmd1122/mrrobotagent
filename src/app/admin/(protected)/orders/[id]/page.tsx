import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PERMISSIONS } from '@/lib/auth/constants'
import { updateOrder } from '../actions'

type Props = { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  await requireAdmin(PERMISSIONS.ORDERS_MANAGE)
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: true, payments: true },
  })
  if (!order) notFound()

  const action = updateOrder.bind(null, id)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">سفارش {order.orderNumber}</h1>
      <div className="admin-card p-4 text-sm">
        <p>مشتری: {order.customer.name}</p>
        <p>تماس: {order.customer.phone || order.customer.email || '—'}</p>
      </div>
      <ul className="admin-card space-y-2 p-4 text-sm">
        {order.items.map((i) => (
          <li key={i.id}>
            {i.productName} × {i.quantity} — {i.lineTotal.toLocaleString('fa-IR')}
          </li>
        ))}
      </ul>
      <form action={action} className="admin-card max-w-xl space-y-3 p-4">
        <label className="block text-sm">
          وضعیت سفارش
          <select name="status" defaultValue={order.status} className="admin-input mt-1">
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          وضعیت پرداخت
          <select name="paymentStatus" defaultValue={order.paymentStatus} className="admin-input mt-1">
            {['UNPAID', 'PAID', 'FAILED', 'REFUNDED'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <textarea
          name="adminNotes"
          className="admin-input min-h-20"
          defaultValue={order.adminNotes || ''}
          placeholder="یادداشت داخلی"
        />
        <textarea
          name="deliveryInfo"
          className="admin-input min-h-16"
          defaultValue={order.deliveryInfo || ''}
          placeholder="اطلاعات تحویل"
        />
        <button type="submit" className="rounded-lg bg-[#e10600] px-4 py-2 text-sm font-semibold">
          ذخیره
        </button>
      </form>
      {order.payments.length > 0 ? (
        <section className="admin-card p-4 text-sm">
          <h2 className="font-semibold">پرداخت‌ها</h2>
          {order.payments.map((p) => (
            <p key={p.id} className="mt-2 text-white/70">
              {p.provider} — {p.status} — {p.amount.toLocaleString('fa-IR')}
            </p>
          ))}
        </section>
      ) : null}
    </div>
  )
}
