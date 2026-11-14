import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getGuestSession } from '@/modules/salon/auth'
import { createBooking } from '@/modules/salon/engine'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  const business = await prisma.salonBusiness.findUnique({ where: { slug } })
  if (!business) return NextResponse.json({ error: 'سالن یافت نشد' }, { status: 404 })
  const guest = await getGuestSession()
  if (!guest || guest.businessId !== business.id) {
    return NextResponse.json({ error: 'ابتدا شماره موبایل را تایید کنید' }, { status: 401 })
  }
  const body = (await req.json()) as {
    offeringId?: string
    employeeId?: string
    start?: string
    name?: string
  }
  try {
    const booking = await createBooking({
      businessId: business.id,
      offeringId: body.offeringId || '',
      employeeId: body.employeeId || null,
      startIso: body.start || '',
      phone: guest.phone,
      name: body.name,
    })
    return NextResponse.json({
      ok: true,
      reference: booking.reference,
      id: booking.id,
      payAtSalon: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ثبت ناموفق بود'
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
