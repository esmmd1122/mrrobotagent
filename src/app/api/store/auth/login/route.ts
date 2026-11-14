import { NextResponse } from 'next/server'
import { z } from 'zod'
import { loginCustomer } from '@/modules/customer-auth/service'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
})

function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const result = await loginCustomer({
    ...parsed.data,
    ip: clientIp(req),
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}