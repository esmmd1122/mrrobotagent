import { NextResponse } from 'next/server'
import { clearStudioCookie } from '@/modules/salon/auth'

export async function POST() {
  await clearStudioCookie()
  return NextResponse.json({ ok: true })
}
