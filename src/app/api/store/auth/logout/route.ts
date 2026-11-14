import { NextResponse } from 'next/server'
import { logoutCustomer } from '@/modules/customer-auth/service'

export async function POST() {
  await logoutCustomer()
  return NextResponse.json({ ok: true })
}