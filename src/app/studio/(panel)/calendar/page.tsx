import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { canManage, getStudioSession } from '@/modules/salon/auth'
import { StudioCalendar } from '@/components/salon/StudioCalendar'

export default async function CalendarPage() {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  const [rows, employees] = await Promise.all([
    prisma.salonBooking.findMany({
      where: { businessId: session.businessId },
      include: { offering: true, employee: true, guest: true },
      orderBy: { startTime: 'asc' },
      take: 400,
    }),
    prisma.salonEmployee.findMany({
      where: { businessId: session.businessId, isActive: true },
      select: { id: true, name: true },
    }),
  ])
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">تقویم نوبت‌ها</h1>
      <StudioCalendar
        canEditAll={canManage(session.role)}
        staffEmployeeId={session.employeeId || null}
        employees={employees}
        bookings={rows.map((row) => ({
          id: row.id,
          reference: row.reference,
          status: row.status,
          start: row.startTime.toISOString(),
          end: row.endTime.toISOString(),
          service: row.offering.name,
          employee: row.employee.name,
          employeeId: row.employeeId,
          phone: row.guest.phone,
        }))}
      />
    </section>
  )
}
