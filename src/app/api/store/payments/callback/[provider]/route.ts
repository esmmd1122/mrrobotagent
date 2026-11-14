import { NextResponse } from 'next/server'
import { handleProviderCallback } from '@/modules/payment/service'
import type { PaymentProviderId } from '@/modules/payment/types'

const ALLOWED: PaymentProviderId[] = ['sandbox', 'zarinpal']

function appOrigin(req: Request) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  if (host) return `${proto}://${host}`
  return new URL(req.url).origin
}

type RouteContext = { params: Promise<{ provider: string }> }

export async function POST(req: Request, context: RouteContext) {
  const { provider } = await context.params
  if (!ALLOWED.includes(provider as PaymentProviderId)) {
    return NextResponse.json({ error: 'درگاه نامعتبر' }, { status: 404 })
  }

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    body = null
  }
  const url = new URL(req.url)
  const result = await handleProviderCallback(
    provider as PaymentProviderId,
    appOrigin(req),
    body,
    url.searchParams,
  )
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}

export async function GET(req: Request, context: RouteContext) {
  return POST(req, context)
}