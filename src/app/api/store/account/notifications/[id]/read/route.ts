import { NextResponse } from 'next/server'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { markNotificationRead } from '@/modules/notifications/service'
import { rateLimit } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

export async function POST(req: Request, context: Ctx) {
  const session = await getCustomerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!rateLimit(`cust-notif:${session.sub}:${clientIp(req)}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await context.params
  const ok = await markNotificationRead(session.sub, id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}