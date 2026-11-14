import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { setGuestCookie, signGuest } from '@/modules/salon/auth'
import { consumeOtp, isIranMobile, normalizePhone } from '@/modules/salon/otp'
import { guardOtpVerify } from '@/modules/salon/otp-guard'
import { safeClientMessage } from '@/lib/env/production'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  const business = await prisma.salonBusiness.findUnique({ where: { slug } })
  if (!business) return NextResponse.json({ error: 'سالن یافت نشد' }, { status: 404 })
  const body = (await req.json()) as { phone?: string; code?: string; purpose?: string }
  const phone = normalizePhone(body.phone || '')
  if (!isIranMobile(phone) || !body.code) {
    return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 })
  }
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
  try {
    await guardOtpVerify({ phone, ip })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'OTP_RATE_LIMIT' ? 429 : 503
    return NextResponse.json({ error: safeClientMessage(error, 'تایید ناموفق بود') }, { status })
  }
  const purpose = body.purpose === 'MANAGE' ? 'MANAGE' : 'BOOK'
  const ok = await consumeOtp(business.id, phone, purpose, body.code.trim())
  if (!ok) return NextResponse.json({ error: 'کد نادرست یا منقضی است' }, { status: 401 })
  const token = await signGuest({ phone, businessId: business.id })
  await setGuestCookie(token)
  return NextResponse.json({ ok: true, phone })
}
