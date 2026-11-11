import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'

export default async function PaymentsPage() {
  await requireAdmin(PERMISSIONS.PAYMENTS_VIEW)
  const [gateways, payments] = await Promise.all([
    prisma.paymentGatewayConfig.findMany(),
    prisma.payment.findMany({
      include: { order: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">پرداخت‌ها</h1>
      <section className="admin-card space-y-2 p-4 text-sm">
        <h2 className="font-semibold">درگاه‌ها (معماری)</h2>
        {gateways.map((g) => (
          <p key={g.id}>
            {g.provider}: {g.isEnabled ? 'فعال' : 'غیرفعال — نیاز به کلید واقعی در سرور'}
          </p>
        ))}
        <p className="text-xs text-white/45">
          تأیید پرداخت، idempotency و callback فقط پس از افزودن credentials و تست انجام می‌شود.
        </p>
      </section>
      <section className="admin-card overflow-x-auto p-4">
        <h2 className="mb-3 font-semibold">تراکنش‌ها</h2>
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>سفارش</th>
              <th>درگاه</th>
              <th>وضعیت</th>
              <th>مبلغ</th>
              <th>مرجع</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.order.orderNumber}</td>
                <td>{p.provider}</td>
                <td>{p.status}</td>
                <td>{p.amount.toLocaleString('fa-IR')}</td>
                <td dir="ltr">{p.referenceId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 ? (
          <p className="text-sm text-white/50">تراکنشی ثبت نشده.</p>
        ) : null}
      </section>
    </div>
  )
}
