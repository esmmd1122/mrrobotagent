import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'

export default async function SupportPage() {
  await requireAdmin(PERMISSIONS.SUPPORT_MANAGE)
  const tickets = await prisma.supportTicket.findMany({
    include: { customer: true, _count: { select: { messages: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">پشتیبانی</h1>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>موضوع</th>
              <th>مشتری</th>
              <th>اولویت</th>
              <th>وضعیت</th>
              <th>پیام</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/admin/support/${t.id}`} className="text-[#e10600]">
                    {t.subject}
                  </Link>
                </td>
                <td>{t.customer?.name || '—'}</td>
                <td>{t.priority}</td>
                <td>{t.status}</td>
                <td>{t._count.messages}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 ? (
          <p className="p-4 text-sm text-white/50">تیکتی ثبت نشده. فرم تماس سایت تیکت می‌سازد.</p>
        ) : null}
      </div>
    </div>
  )
}
