import { prisma } from '@/lib/db'
import { getStudioSession } from '@/modules/salon/auth'
import { redirect } from 'next/navigation'

export default async function CustomersPage() {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  const guests = await prisma.salonGuest.findMany({
    where: { businessId: session.businessId },
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return (
    <section>
      <h1 className="text-xl font-semibold">مشتریان همین سالن</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {guests.map((g) => (
          <li key={g.id} className="rounded-lg border border-white/10 px-3 py-2">
            {g.name || 'بدون نام'} — {g.phone} — {g._count.bookings} نوبت
            {g.notes ? ` — ${g.notes}` : ''}
          </li>
        ))}
      </ul>
    </section>
  )
}
