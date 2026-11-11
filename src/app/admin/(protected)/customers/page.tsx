import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'

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
      <h1 className="text-xl font-bold">مشتریان</h1>
      <form>
        <input name="q" defaultValue={q} placeholder="جستجو نام / تماس" className="admin-input max-w-sm" />
      </form>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full min-w-[640px]">
          <thead>
            <tr>
              <th>نام</th>
              <th>تماس</th>
              <th>سفارش</th>
              <th>عضویت</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/customers/${c.id}`} className="text-[#e10600]">
                    {c.name}
                  </Link>
                </td>
                <td>{c.phone || c.email || '—'}</td>
                <td>{c._count.orders}</td>
                <td>{new Date(c.createdAt).toLocaleDateString('fa-IR')}</td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
