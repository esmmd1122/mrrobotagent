import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getGuestSession } from '@/modules/salon/auth'
import { rescheduleBooking } from '@/modules/salon/engine'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  const business = await prisma.salonBusiness.findUnique({ where: { slug } })
  if (!business) return NextResponse.json({ error: 'سالن یافت نشد' }, { status: 404 })
  const guest = await getGuestSession()
  if (!guest || guest.businessId !== business.id) {
    return NextResponse.json({ error: 'شماره تایید نشده است' }, { status: 401 })
  }
  const body = (await req.json()) as { bookingId?: string; start?: string }
  try {
    const booking = await rescheduleBooking({
      businessId: business.id,
      phone: guest.phone,
      bookingId: body.bookingId || '',
      startIso: body.start || '',
    })
    return NextResponse.json({ ok: true, reference: booking.reference, start: booking.startTime })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تغییر ناموفق بود'
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
