import { headers } from 'next/headers'
import { sanitizeAppOrigin } from './origin-safety'

export async function resolveAppOrigin(): Promise<string> {
  const hdrs = await headers()
  return sanitizeAppOrigin({
    forwardedProto: hdrs.get('x-forwarded-proto'),
    forwardedHost: hdrs.get('x-forwarded-host'),
    host: hdrs.get('host'),
    envAppUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
  })
}