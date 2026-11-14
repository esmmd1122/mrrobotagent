import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'
import { initiatePaymentForCustomerSession, initiatePaymentForOrder } from '@/modules/payment/service'

export type AfterOrderPaymentInput = {
  orderNumber: string
  viewToken: string
  customerSessionId?: string | null
  appOrigin: string
}

/** After order creation: try gateway redirect; otherwise confirmation with error code. */
export async function redirectAfterOrderPayment(input: AfterOrderPaymentInput): Promise<never> {
  const payKey = randomUUID()
  const confirmation = `/orders/confirmation?orderNumber=${encodeURIComponent(input.orderNumber)}&token=${encodeURIComponent(input.viewToken)}`

  const result = input.customerSessionId
    ? await initiatePaymentForCustomerSession(
        input.customerSessionId,
        input.orderNumber,
        payKey,
        input.appOrigin,
      )
    : await initiatePaymentForOrder({
        orderNumber: input.orderNumber,
        viewToken: input.viewToken,
        idempotencyKey: payKey,
        appOrigin: input.appOrigin,
      })

  if (result.ok && result.redirectUrl) {
    redirect(result.redirectUrl)
  }
  const code = result.ok ? 'NO_REDIRECT' : result.code
  const message = result.ok ? '' : result.message
  redirect(
    `${confirmation}&payError=${encodeURIComponent(code)}${message ? `&payMsg=${encodeURIComponent(message)}` : ''}`,
  )
}