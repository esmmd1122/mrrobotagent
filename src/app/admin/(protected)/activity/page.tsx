import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'

export default async function ActivityPage() {
  await requireAdmin(PERMISSIONS.ACTIVITY_VIEW)
  const logs = await prisma.activityLog.findMany({
    include: { admin: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">گزارش فعالیت</h1>
      <p className="text-sm text-white/50">ورود، تغییر محصول، سفارش، پشتیبانی و محتوا.</p>
      <div className="admin-card max-h-[70vh] overflow-y-auto p-4">
        <ul className="space-y-2 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="border-b border-[#2a2b35]/60 pb-2">
              <p className="font-medium">{l.action}</p>
              <p className="text-xs text-white/45">
                {l.admin?.name || 'سیستم'} — {l.entity || ''} {l.entityId || ''} —{' '}
                {new Date(l.createdAt).toLocaleString('fa-IR')}
              </p>
            </li>
          ))}
          {logs.length === 0 ? <li className="text-white/50">بدون رخداد</li> : null}
        </ul>
      </div>
    </div>
  )
}
