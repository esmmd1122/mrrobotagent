import { isPaymentSandboxAllowed } from '../environment'
import { signSandboxProof, verifySandboxProof } from '../sandbox-proof'
import type {
  InitiatePaymentContext,
  InitiatePaymentResult,
  PaymentProvider,
  VerifyPaymentContext,
  VerifyPaymentResult,
} from '../types'

export function createSandboxProvider(appOrigin: string): PaymentProvider {
  return {
    id: 'sandbox',
    async initiate(ctx: InitiatePaymentContext): Promise<InitiatePaymentResult> {
      if (!isPaymentSandboxAllowed()) {
        return {
          ok: false,
          code: 'SANDBOX_DISABLED',
          message: 'پرداخت آزمایشی در این محیط غیرفعال است.',
        }
      }
      const exp = Date.now() + 30 * 60 * 1000
      const proof = signSandboxProof(ctx.paymentId, ctx.amount, exp)
      const q = new URLSearchParams({
        paymentId: ctx.paymentId,
        orderNumber: ctx.orderNumber,
        exp: String(exp),
        proof,
      })
      return {
        ok: true,
        redirectUrl: `${appOrigin}/orders/pay?${q.toString()}`,
        providerReference: `sandbox-${ctx.paymentId}`,
      }
    },
    async verify(ctx: VerifyPaymentContext): Promise<VerifyPaymentResult> {
      if (!isPaymentSandboxAllowed()) {
        return { verified: false, reason: 'sandbox_disabled' }
      }
      const paymentId = String(ctx.payload.paymentId || '')
      const proof = String(ctx.payload.proof || '')
      const exp = Number(ctx.payload.exp)
      const amount = Number(ctx.payload.amount)
      if (paymentId !== ctx.paymentId) {
        return { verified: false, reason: 'payment_mismatch' }
      }
      if (amount !== ctx.expectedAmount) {
        return { verified: false, reason: 'amount_mismatch' }
      }
      if (!verifySandboxProof(paymentId, amount, exp, proof)) {
        return { verified: false, reason: 'invalid_proof' }
      }
      return { verified: true, referenceId: `sandbox-${paymentId}` }
    },
    parseCallback(body: unknown, searchParams: URLSearchParams) {
      const fromQuery = Object.fromEntries(searchParams.entries())
      if (body && typeof body === 'object') {
        return { ...(body as Record<string, unknown>), ...fromQuery }
      }
      return fromQuery
    },
  }
}