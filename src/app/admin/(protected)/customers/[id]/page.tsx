import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'

type Props = { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Props) {
  await requireAdmin(PERMISSIONS.CUSTOMERS_VIEW)
  const { id } = await params
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: 'desc' } },
      tickets: { take: 10 },
      aiRequests: { take: 10 },
    },
  })
  if (!customer) notFound()

  const totalPurchases = customer.orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((s, o) => s + o.totalAmount, 0)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{customer.name}</h1>
      <div className="admin-card grid gap-2 p-4 text-sm sm:grid-cols-2">
        <p>تلفن: {customer.phone || '—'}</p>
        <p>ایمیل: {customer.email || '—'}</p>
        <p>وضعیت: {customer.status}</p>
        <p>مجموع خرید: {totalPurchases.toLocaleString('fa-IR')}</p>
      </div>
      <section className="admin-card p-4">
        <h2 className="font-semibold">سفارش‌ها</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {customer.orders.map((o) => (
            <li key={o.id}>
              {o.orderNumber} — {o.status} — {o.totalAmount.toLocaleString('fa-IR')}
            </li>
          ))}
          {customer.orders.length === 0 ? <li className="text-white/50">بدون سفارش</li> : null}
        </ul>
      </section>
    </div>
  )
}
