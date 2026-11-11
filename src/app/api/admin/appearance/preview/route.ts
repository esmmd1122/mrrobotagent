import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { PREVIEW_COOKIE } from '@/lib/site-config/service'

export async function POST() {
  const auth = await requireAdminApi(PERMISSIONS.CONTENT_MANAGE)
  if (auth.error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(PREVIEW_COOKIE, 'draft', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 30,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(PREVIEW_COOKIE)
  return res
}
