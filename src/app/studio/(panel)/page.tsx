import { prisma } from '@/lib/db'
import { getStudioSession } from '@/modules/salon/auth'
import { faDateTime } from '@/modules/salon/format'
import { redirect } from 'next/navigation'

export default async function StudioHome() {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  const business = await prisma.salonBusiness.findUnique({
    where: { id: session.businessId },
    include: { subscription: { include: { plan: true } } },
  })
  if (!business) redirect('/studio/login')
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const [today, upcoming, done, cancelled, guests] = await Promise.all([
    prisma.salonBooking.count({
      where: { businessId: business.id, startTime: { gte: start }, status: { in: ['PENDING', 'CONFIRMED'] } },
    }),
    prisma.salonBooking.count({
      where: { businessId: business.id, startTime: { gte: new Date() }, status: 'CONFIRMED' },
    }),
    prisma.salonBooking.count({ where: { businessId: business.id, status: 'COMPLETED' } }),
    prisma.salonBooking.count({ where: { businessId: business.id, status: 'CANCELLED' } }),
    prisma.salonGuest.count({ where: { businessId: business.id } }),
  ])
  const notes = await prisma.salonNotification.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })
  return (
    <section className="space-y-5">
      <header className="admin-card flex flex-wrap items-end justify-between gap-4 p-6">
        <div>
        <p className="mr-kicker">COMMAND</p>
        <h1 className="mt-2">{business.name}</h1>
        <p className="text-sm text-white/60">
          طرح {business.subscription?.plan.nameFa} — نوبت این دوره {business.subscription?.bookingCount} از {business.subscription?.plan.monthlyBookingLimit}
        </p>
        <p className="text-sm text-white/50">
          {business.published ? `صفحه رزرو: /salon/${business.slug}` : 'هنوز منتشر نشده است'}
        </p>
        </div>
        <img src="/images/mr-robot-character.png" alt="" className="h-20 w-20 object-contain" />
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['نوبت‌های پیش رو از امروز', today],
          ['تایید شده آینده', upcoming],
          ['انجام شده', done],
          ['لغو شده', cancelled],
          ['مشتریان', guests],
        ].map(([label, value]) => (
          <article key={String(label)} className="admin-card p-4">
            <p className="text-xs text-[#9297A3]">{label}</p>
            <p className="mr-metric mt-2">{value}</p>
          </article>
        ))}
      </div>
      <ul className="space-y-2 text-sm">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg border border-white/10 px-3 py-2">
            {n.title} — {n.body}
            <span className="mr-2 text-white/40">{faDateTime(n.createdAt)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-white/40">Powered by MR.ROBOT AI</p>
    </section>
  )
}
