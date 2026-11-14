import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { receptionistReply } from '@/modules/salon/ai'
import { getGuestSession } from '@/modules/salon/auth'
import { rateLimit } from '@/modules/salon/otp'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  const business = await prisma.salonBusiness.findUnique({ where: { slug } })
  if (!business || !business.published) {
    return NextResponse.json({ error: 'سالن یافت نشد' }, { status: 404 })
  }
  if (!rateLimit(`ai:${business.id}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'تعداد پیام زیاد است' }, { status: 429 })
  }
  const body = (await req.json()) as { message?: string; conversationId?: string }
  if (!body.message || body.message.length > 1000) {
    return NextResponse.json({ error: 'پیام نامعتبر است' }, { status: 400 })
  }
  const guest = await getGuestSession()
  const guestOk = Boolean(guest && guest.businessId === business.id)
  const reply = await receptionistReply({
    businessId: business.id,
    message: body.message,
    channel: 'text',
    conversationId: body.conversationId,
    guestPhone: guestOk ? guest!.phone : null,
    guestVerified: guestOk,
  })
  return NextResponse.json(reply)
}
