import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getGuestSession } from '@/modules/salon/auth'
import { cancelBooking } from '@/modules/salon/engine'

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
  const body = (await req.json()) as { bookingId?: string }
  try {
    const booking = await cancelBooking({
      businessId: business.id,
      phone: guest.phone,
      bookingId: body.bookingId || '',
    })
    return NextResponse.json({ ok: true, reference: booking.reference, status: booking.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'لغو ناموفق بود'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
