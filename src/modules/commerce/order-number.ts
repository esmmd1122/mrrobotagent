import { randomBytes } from 'crypto'

/** Human-readable unique order number, e.g. MR-241114-A3F2 */
export function generateOrderNumber() {
  const d = new Date()
  const y = String(d.getFullYear()).slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const suffix = randomBytes(2).toString('hex').toUpperCase()
  return `MR-${y}${m}${day}-${suffix}`
}

export function generateCustomerViewToken() {
  return randomBytes(24).toString('base64url')
}