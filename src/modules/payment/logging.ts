import { prisma } from '@/lib/db'
import type { PAYMENT_TX_TYPES } from './statuses'

export async function logPaymentTransaction(
  paymentId: string,
  type: (typeof PAYMENT_TX_TYPES)[number],
  status: string,
  rawPayload?: unknown,
) {
  await prisma.paymentTransaction.create({
    data: {
      paymentId,
      type,
      status,
      rawPayload: rawPayload != null ? JSON.stringify(rawPayload).slice(0, 50_000) : null,
    },
  })
}