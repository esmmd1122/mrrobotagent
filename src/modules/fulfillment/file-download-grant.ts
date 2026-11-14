import { createHmac, timingSafeEqual } from 'crypto'
import { hashOrderViewToken } from '../commerce/order-view-hash.ts'

const GRANT_TTL_MS = 15 * 60 * 1000

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET required')
  return s
}

export function createFileDownloadGrant(fileId: string, orderNumber: string, viewToken: string) {
  const exp = Date.now() + GRANT_TTL_MS
  const owner = hashOrderViewToken(viewToken)
  const payload = `vt:${fileId}:${orderNumber}:${owner}:${exp}`
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url')
  return { exp, sig }
}

export function createFileDownloadGrantForCustomer(
  fileId: string,
  orderNumber: string,
  customerId: string,
) {
  const exp = Date.now() + GRANT_TTL_MS
  const payload = `cu:${fileId}:${orderNumber}:${customerId}:${exp}`
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url')
  return { exp, sig }
}

export function verifyFileDownloadGrant(
  fileId: string,
  orderNumber: string,
  viewToken: string,
  exp: number,
  sig: string,
): boolean {
  if (Date.now() > exp) return false
  const owner = hashOrderViewToken(viewToken)
  const expected = createHmac('sha256', secret())
    .update(`vt:${fileId}:${orderNumber}:${owner}:${exp}`)
    .digest('base64url')
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(sig)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function verifyCustomerSessionFileGrant(
  fileId: string,
  orderNumber: string,
  customerId: string,
  exp: number,
  sig: string,
): boolean {
  if (Date.now() > exp) return false
  const expected = createHmac('sha256', secret())
    .update(`cu:${fileId}:${orderNumber}:${customerId}:${exp}`)
    .digest('base64url')
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(sig)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export { GRANT_TTL_MS }