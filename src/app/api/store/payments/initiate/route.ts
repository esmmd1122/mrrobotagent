import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { initiatePaymentForCustomerSession, initiatePaymentForOrder } from '@/modules/payment/service'

const bodySchema = z.object({
  orderNumber: z.string().min(4).max(40),
  viewToken: z.string().min(16).max(200).optional(),
  idempotencyKey: z.string().uuid(),
})

function appOrigin(req: Request) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  if (host) return `${proto}://${host}`
  return new URL(req.url).origin
}

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
    }

    const origin = appOrigin(req)
    const result = parsed.data.viewToken
      ? await initiatePaymentForOrder({
          orderNumber: parsed.data.orderNumber,
          viewToken: parsed.data.viewToken,
          idempotencyKey: parsed.data.idempotencyKey,
          appOrigin: origin,
        })
      : await (async () => {
          const session = await getCustomerSession()
          if (!session) {
            return { ok: false as const, code: 'UNAUTHORIZED', message: 'ورود الزامی است.' }
          }
          return initiatePaymentForCustomerSession(
            session.sub,
            parsed.data.orderNumber,
            parsed.data.idempotencyKey,
            origin,
          )
        })()

    if (!result.ok) {
      const status =
        result.code === 'UNAUTHORIZED'
          ? 401
          : result.code === 'FORBIDDEN'
            ? 403
            : result.code === 'ALREADY_PAID'
              ? 409
              : 400
      return NextResponse.json({ error: result.message, code: result.code }, { status })
    }

    return NextResponse.json({
      ok: true,
      paymentId: result.paymentId,
      redirectUrl: result.redirectUrl,
      provider: result.provider,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 })
  }
}