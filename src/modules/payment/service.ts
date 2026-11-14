import { prisma } from '@/lib/db'
import { logPaymentTransaction } from './logging'
import { resolvePaymentProvider } from './registry'
import type { PaymentProviderId } from './types'
import { notifyCustomer, copyForNotificationType } from '../notifications/service'
import { initiatePaymentCore } from './initiate-core'
import {
  loadOrderPaymentContextByViewToken,
  loadOrderPaymentContextForCustomer,
} from './order-payment-context'

export type InitiateForOrderInput = {
  orderNumber: string
  viewToken: string
  idempotencyKey: string
  appOrigin: string
}

export type InitiateForOrderResult =
  | { ok: true; paymentId: string; redirectUrl: string; provider: string }
  | { ok: false; code: string; message: string }

function amountsMatch(expected: number, actual: number) {
  return Math.round(expected) === Math.round(actual)
}

export async function initiatePaymentForOrder(input: InitiateForOrderInput): Promise<InitiateForOrderResult> {
  const order = await loadOrderPaymentContextByViewToken(input.orderNumber, input.viewToken)
  if (!order) {
    return { ok: false, code: 'FORBIDDEN', message: 'دسترسی به سفارش مجاز نیست.' }
  }
  return initiatePaymentCore({
    order,
    idempotencyKey: input.idempotencyKey,
    appOrigin: input.appOrigin,
    viewTokenForSandbox: input.viewToken,
  })
}

export async function initiatePaymentForCustomerSession(
  customerId: string,
  orderNumber: string,
  idempotencyKey: string,
  appOrigin: string,
): Promise<InitiateForOrderResult> {
  const order = await loadOrderPaymentContextForCustomer(customerId, orderNumber)
  if (!order) {
    return { ok: false, code: 'FORBIDDEN', message: 'دسترسی به سفارش مجاز نیست.' }
  }
  return initiatePaymentCore({
    order,
    idempotencyKey,
    appOrigin,
  })
}

export async function verifyAndApplyPayment(
  paymentId: string,
  providerId: PaymentProviderId,
  appOrigin: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; code: string; message: string }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  })
  if (!payment) {
    return { ok: false, code: 'NOT_FOUND', message: 'پرداخت یافت نشد.' }
  }
  if (payment.provider !== providerId) {
    return { ok: false, code: 'PROVIDER_MISMATCH', message: 'درگاه ناسازگار.' }
  }

  if (payment.status === 'VERIFIED') {
    return { ok: true, code: 'ALREADY_VERIFIED', message: 'پرداخت قبلاً تأیید شده است.' }
  }

  const provider = await resolvePaymentProvider(providerId, appOrigin)
  await logPaymentTransaction(payment.id, 'CALLBACK', 'RECEIVED', payload)

  const verify = await provider.verify({
    paymentId: payment.id,
    expectedAmount: payment.amount,
    currency: payment.currency,
    payload,
  })

  if (!verify.verified) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: verify.reason },
    })
    await logPaymentTransaction(payment.id, 'VERIFY_FAILED', verify.reason, payload)
    return { ok: false, code: 'VERIFY_FAILED', message: 'تأیید پرداخت ناموفق بود.' }
  }

  if (!amountsMatch(payment.order.totalAmount, payment.amount)) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: 'amount_order_mismatch' },
    })
    await logPaymentTransaction(payment.id, 'ERROR', 'amount_order_mismatch', payload)
    return { ok: false, code: 'AMOUNT_MISMATCH', message: 'مبلغ پرداخت با سفارش همخوانی ندارد.' }
  }

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.payment.findUnique({ where: { id: payment.id } })
    if (fresh?.status === 'VERIFIED') return

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'VERIFIED',
        referenceId: verify.referenceId,
        verifiedAt: new Date(),
        failureReason: null,
      },
    })
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'PAID',
      },
    })
  })

  await logPaymentTransaction(payment.id, 'VERIFY', 'VERIFIED', {
    referenceId: verify.referenceId,
  })

  const copy = copyForNotificationType('PAYMENT_CONFIRMED', payment.order.orderNumber)
  await notifyCustomer({
    customerId: payment.order.customerId,
    orderId: payment.orderId,
    type: 'PAYMENT_CONFIRMED',
    title: copy.title,
    body: copy.body,
  })

  return { ok: true, code: 'VERIFIED', message: 'پرداخت با موفقیت تأیید شد.' }
}

export async function handleProviderCallback(
  providerId: PaymentProviderId,
  appOrigin: string,
  body: unknown,
  searchParams: URLSearchParams,
) {
  const provider = await resolvePaymentProvider(providerId, appOrigin)
  const payload = provider.parseCallback(body, searchParams)
  const paymentId = String(payload.paymentId || payload.payment_id || '')
  if (!paymentId) {
    return { ok: false, code: 'MISSING_PAYMENT_ID', message: 'شناسه پرداخت یافت نشد.' }
  }
  return verifyAndApplyPayment(paymentId, providerId, appOrigin, payload)
}