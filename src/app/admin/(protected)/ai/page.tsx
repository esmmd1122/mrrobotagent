import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'

export default async function AdminAIPage() {
  await requireAdmin(PERMISSIONS.AI_MANAGE)
  const [offerings, requests] = await Promise.all([
    prisma.aIServiceOffering.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.aIServiceRequest.findMany({
      include: { customer: true, offering: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">MR.ROBOT AI</h1>
      <section className="admin-card p-4">
        <h2 className="font-semibold">سرویس‌های قابل ارائه</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {offerings.map((o) => (
            <li key={o.id}>
              {o.titleFa} — {o.isAvailable ? 'فعال' : 'غیرفعال'}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-white/45">
          ویرایش پیشرفته سرویس‌ها و API Provider در فاز بعدی (بدون ادعای اتصال فعال).
        </p>
      </section>
      <section className="admin-card overflow-x-auto p-4">
        <h2 className="mb-3 font-semibold">درخواست‌های مشتری</h2>
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>عنوان</th>
              <th>مشتری</th>
              <th>تماس</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.customer?.name || '—'}</td>
                <td>{r.contact}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
