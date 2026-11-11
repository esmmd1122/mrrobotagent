import { NextResponse } from 'next/server'
import { clearSessionCookie, getSession } from '@/lib/auth/session'
import { logActivity } from '@/lib/activity'

export async function POST() {
  const session = await getSession()
  if (session) {
    await logActivity({
      adminId: session.sub,
      action: 'admin.logout',
      entity: 'AdminUser',
      entityId: session.sub,
    })
  }
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
