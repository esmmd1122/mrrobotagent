import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'

const CUSTOMER_STATUS_FA: Record<string, string> = {
  ACTIVE: 'فعال',
  BLOCKED: 'مسدود',
  INACTIVE: 'غیرفعال',
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await requireAdmin(PERMISSIONS.CUSTOMERS_VIEW)
  const q = (await searchParams).q?.trim()

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">مشتریان</h1>
          <p className="mt-0.5 text-xs text-white/55">
            {customers.length.toLocaleString('fa-IR')} مشتری نمایش داده می‌شود
          </p>
        </div>
      </div>

      <form className="admin-card flex flex-wrap items-center gap-2 p-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="جستجو بر اساس نام، ایمیل یا شماره تماس..."
          className="admin-input min-w-[220px] flex-1 max-w-md"
        />
        <button
          type="submit"
          className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#e10600] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#c80500]"
        >
          جستجو
        </button>
        {q ? (
          <Link
            href="/admin/customers"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-xs text-white/75 hover:text-white"
          >
            پاک کردن
          </Link>
        ) : null}
      </form>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full min-w-[640px]">
          <thead>
            <tr>
              <th>نام</th>
              <th>تماس</th>
              <th>تعداد سفارش</th>
              <th>تاریخ عضویت</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/customers/${c.id}`} className="font-semibold text-[#e10600] hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td dir="ltr" className="text-right">
                  {c.phone || c.email || '—'}
                </td>
                <td className="tabular-nums">{c._count.orders.toLocaleString('fa-IR')}</td>
                <td>{new Date(c.createdAt).toLocaleDateString('fa-IR')}</td>
                <td>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs ${
                      c.status === 'ACTIVE'
                        ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/15 bg-white/5 text-white/60'
                    }`}
                  >
                    {CUSTOMER_STATUS_FA[c.status] || c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 ? (
          <p className="p-6 text-center text-sm text-white/55">مشتری‌ای با این مشخصات یافت نشد.</p>
        ) : null}
      </div>
    </div>
  )
}
