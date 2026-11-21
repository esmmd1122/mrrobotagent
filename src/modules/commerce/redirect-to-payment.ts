import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'
import { getPaymentGatewayAvailability } from '@/modules/payment/registry'
import { initiatePaymentForCustomerSession, initiatePaymentForOrder } from '@/modules/payment/service'

export type AfterOrderPaymentInput = {
  orderNumber: string
  viewToken: string
  customerSessionId?: string | null
  appOrigin: string
}

/**
 * After order creation:
 * - If no usable online payment gateway is configured, route cleanly to the order confirmation page
 *   in offline-payment mode (order stays UNPAID / PENDING_PAYMENT).
 * - If an online gateway is enabled and usable, initiate payment and redirect, falling back to confirmation on error.
 */
export async function redirectAfterOrderPayment(input: AfterOrderPaymentInput): Promise<never> {
  const confirmation = `/orders/confirmation?orderNumber=${encodeURIComponent(input.orderNumber)}&token=${encodeURIComponent(input.viewToken)}`

  const gateway = await getPaymentGatewayAvailability()
  if (!gateway.available) {
    redirect(`${confirmation}&paymentMode=offline`)
  }

  const payKey = randomUUID()
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