import { prisma } from '@/lib/db'
import { logPaymentTransaction } from './logging'
import { selectEnabledProvider, resolvePaymentProvider } from './registry'
import type { PaymentProviderId } from './types'
import type { OrderPaymentContext } from './order-payment-context'

function amountsMatch(expected: number, actual: number) {
  return Math.round(expected) === Math.round(actual)
}

export type InitiateCoreInput = {
  order: OrderPaymentContext
  idempotencyKey: string
  appOrigin: string
  viewTokenForSandbox?: string
}

export type InitiateCoreResult =
  | { ok: true; paymentId: string; redirectUrl: string; provider: string }
  | { ok: false; code: string; message: string }

export async function initiatePaymentCore(input: InitiateCoreInput): Promise<InitiateCoreResult> {
  const order = input.order
  if (order.paymentStatus === 'PAID') {
    return { ok: false, code: 'ALREADY_PAID', message: 'این سفارش قبلاً پرداخت شده است.' }
  }
  if (order.totalAmount <= 0) {
    return { ok: false, code: 'INVALID_AMOUNT', message: 'مبلغ سفارش نامعتبر است.' }
  }

  const existing = await prisma.payment.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { order: true },
  })
  if (existing) {
    if (existing.order.orderNumber !== order.orderNumber) {
      return { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'کلید idempotency متعلق به سفارش دیگری است.' }
    }
    if (existing.status === 'VERIFIED') {
      return { ok: false, code: 'ALREADY_PAID', message: 'پرداخت قبلاً تأیید شده است.' }
    }
    if (existing.redirectUrl) {
      return {
        ok: true,
        paymentId: existing.id,
        redirectUrl: existing.redirectUrl,
        provider: existing.provider,
      }
    }
  }

  const selected = await selectEnabledProvider(input.appOrigin)
  if (!selected) {
    return {
      ok: false,
      code: 'NO_GATEWAY',
      message: 'هیچ درگاه پرداخت فعال و پیکربندی‌شده‌ای وجود ندارد.',
    }
  }

  const payment =
    existing ??
    (await prisma.payment.create({
      data: {
        orderId: order.orderId,
        provider: selected.providerId,
        status: 'INITIATED',
        amount: order.totalAmount,
        currency: order.currency,
        idempotencyKey: input.idempotencyKey,
      },
    }))

  const ctx = {
    paymentId: payment.id,
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    amount: order.totalAmount,
    currency: order.currency,
    callbackUrl: `${input.appOrigin}/api/store/payments/callback/${selected.providerId}`,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
  }

  const initiated = await selected.provider.initiate(ctx)
  await logPaymentTransaction(payment.id, 'INITIATE', initiated.ok ? 'OK' : 'FAILED', initiated)

  if (!initiated.ok) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: initiated.message },
    })
    return { ok: false, code: initiated.code, message: initiated.message }
  }

  let redirectUrl = initiated.redirectUrl
  if (selected.providerId === 'sandbox' && input.viewTokenForSandbox) {
    const u = new URL(initiated.redirectUrl)
    u.searchParams.set('viewToken', input.viewTokenForSandbox)
    redirectUrl = u.toString()
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'REDIRECTED',
      redirectUrl,
      referenceId: initiated.providerReference ?? payment.referenceId,
    },
  })
  await logPaymentTransaction(payment.id, 'REDIRECT', 'OK', { redirectUrl })

  return {
    ok: true,
    paymentId: payment.id,
    redirectUrl,
    provider: selected.providerId,
  }
}

export { amountsMatch, resolvePaymentProvider }