import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isIranMobile, issueOtp, normalizePhone } from '@/modules/salon/otp'
import { guardOtpSend } from '@/modules/salon/otp-guard'
import { devRevealAllowed } from '@/modules/salon/otp-policy'
import { safeClientMessage } from '@/lib/env/production'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  const business = await prisma.salonBusiness.findUnique({ where: { slug } })
  if (!business || business.status !== 'ACTIVE' || !business.published) {
    return NextResponse.json({ error: 'سالن یافت نشد' }, { status: 404 })
  }
  const body = (await req.json()) as { phone?: string; purpose?: string }
  const phone = normalizePhone(body.phone || '')
  if (!isIranMobile(phone)) {
    return NextResponse.json({ error: 'شماره موبایل معتبر نیست' }, { status: 400 })
  }
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
  const purpose = body.purpose === 'MANAGE' ? 'MANAGE' : 'BOOK'
  try {
    await guardOtpSend({ phone, ip, purpose })
    const result = await issueOtp(business.id, phone, purpose)
    const reveal = devRevealAllowed() && result.devCode
    return NextResponse.json({
      ok: true,
      channel: reveal ? 'dev' : 'sms',
      ...(reveal ? { devCode: result.devCode } : {}),
      notice: reveal ? 'حالت توسعه: کد پیامک واقعی ارسال نشد.' : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'OTP_RATE_LIMIT' || message === 'OTP_COOLDOWN' ? 429 : 503
    return NextResponse.json({ error: safeClientMessage(error, 'ارسال کد ناموفق بود') }, { status })
  }
}
