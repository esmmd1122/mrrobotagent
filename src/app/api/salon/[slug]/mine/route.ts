import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getGuestSession } from '@/modules/salon/auth'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  const business = await prisma.salonBusiness.findUnique({ where: { slug } })
  if (!business) return NextResponse.json({ error: 'سالن یافت نشد' }, { status: 404 })
  const guest = await getGuestSession()
  if (!guest || guest.businessId !== business.id) {
    return NextResponse.json({ error: 'شماره تایید نشده است' }, { status: 401 })
  }
  const rows = await prisma.salonBooking.findMany({
    where: { businessId: business.id, guest: { phone: guest.phone } },
    include: { offering: true, employee: true },
    orderBy: { startTime: 'desc' },
    take: 20,
  })
  return NextResponse.json({
    phone: guest.phone,
    bookings: rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      start: row.startTime.toISOString(),
      service: row.offering.name,
      employee: row.employee.name,
      offeringId: row.offeringId,
      employeeId: row.employeeId,
    })),
  })
}
