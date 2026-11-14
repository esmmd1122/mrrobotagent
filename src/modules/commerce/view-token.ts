import { timingSafeEqual } from 'crypto'
import { hashOrderViewToken } from './order-view-hash.ts'

export { hashOrderViewToken } from './order-view-hash.ts'

export function verifyOrderViewToken(token: string, storedHash: string | null): boolean {
  if (!storedHash || !token) return false
  const computed = hashOrderViewToken(token)
  try {
    const a = Buffer.from(computed)
    const b = Buffer.from(storedHash)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}