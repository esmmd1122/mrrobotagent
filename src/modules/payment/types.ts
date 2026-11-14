export type PaymentProviderId = 'zarinpal' | 'sandbox'

export type InitiatePaymentContext = {
  paymentId: string
  orderId: string
  orderNumber: string
  amount: number
  currency: string
  callbackUrl: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
}

export type InitiatePaymentResult =
  | { ok: true; redirectUrl: string; providerReference?: string }
  | { ok: false; code: 'NOT_CONFIGURED' | 'SANDBOX_DISABLED' | 'PROVIDER_ERROR'; message: string }

export type VerifyPaymentContext = {
  paymentId: string
  expectedAmount: number
  currency: string
  payload: Record<string, unknown>
}

export type VerifyPaymentResult =
  | { verified: true; referenceId: string }
  | { verified: false; reason: string }

export interface PaymentProvider {
  readonly id: PaymentProviderId
  initiate(ctx: InitiatePaymentContext): Promise<InitiatePaymentResult>
  verify(ctx: VerifyPaymentContext): Promise<VerifyPaymentResult>
  parseCallback(body: unknown, searchParams: URLSearchParams): Record<string, unknown>
}