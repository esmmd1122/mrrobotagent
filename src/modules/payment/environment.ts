import { createHmac, timingSafeEqual } from 'crypto'

function isProductionRuntime(env: NodeJS.ProcessEnv) {
  if (env.NEXT_PHASE === 'phase-production-build') return false
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production'
}

/**
 * Sandbox gateway is disabled in production regardless of env flags.
 * In non-production, requires explicit ALLOW_PAYMENT_SANDBOX=true.
 */
export function isPaymentSandboxAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isProductionRuntime(env)) return false
  return env.ALLOW_PAYMENT_SANDBOX === 'true'
}

function sandboxSecret() {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET required')
  return s
}

export function signSandboxProof(paymentId: string, amount: number, exp: number) {
  return createHmac('sha256', sandboxSecret())
    .update(`${paymentId}:${amount}:${exp}`)
    .digest('base64url')
}

export function verifySandboxProof(
  paymentId: string,
  amount: number,
  exp: number,
  proof: string,
): boolean {
  if (!isPaymentSandboxAllowed()) return false
  if (Date.now() > exp) return false
  const expected = signSandboxProof(paymentId, amount, exp)
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(proof)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}