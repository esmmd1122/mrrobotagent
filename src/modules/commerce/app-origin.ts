import { headers } from 'next/headers'

export async function resolveAppOrigin(): Promise<string> {
  const hdrs = await headers()
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host')
  const proto = hdrs.get('x-forwarded-proto') || 'http'
  return host ? `${proto}://${host}` : 'http://localhost:3000'
}