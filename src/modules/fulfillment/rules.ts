/** Mirror of `FULFILLMENT_STATUSES` in commerce/constants (kept local for Node unit tests). */
const FULFILLMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'WAITING_FOR_CUSTOMER',
  'COMPLETED',
  'FAILED',
] as const

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number]

const PAID_REQUIRED: FulfillmentStatus[] = [
  'PROCESSING',
  'WAITING_FOR_CUSTOMER',
  'COMPLETED',
]

/** Server-side rules: paid orders only enter active fulfillment / completion. */
export function assertFulfillmentTransition(
  paymentStatus: string,
  nextStatus: FulfillmentStatus,
): { ok: true } | { ok: false; reason: string } {
  if (nextStatus === 'COMPLETED' && paymentStatus !== 'PAID') {
    return { ok: false, reason: 'تحویل موفق فقط پس از پرداخت تأیید‌شده مجاز است.' }
  }
  if (PAID_REQUIRED.includes(nextStatus) && paymentStatus !== 'PAID') {
    return { ok: false, reason: 'این مرحله تحویل فقط برای سفارش‌های پرداخت‌شده مجاز است.' }
  }
  return { ok: true }
}

export function canAssignFulfillment(paymentStatus: string): boolean {
  return paymentStatus === 'PAID'
}

/** Keeps order.status aligned only on explicit, validated fulfillment outcomes. */
export function deriveOrderStatusAfterFulfillment(input: {
  paymentStatus: string
  fulfillmentStatus: FulfillmentStatus
  currentOrderStatus: string
}): string {
  if (input.fulfillmentStatus === 'COMPLETED') {
    return input.paymentStatus === 'PAID' ? 'COMPLETED' : input.currentOrderStatus
  }
  if (input.fulfillmentStatus === 'FAILED') {
    return input.currentOrderStatus === 'COMPLETED' ? 'PROCESSING' : input.currentOrderStatus
  }
  if (input.fulfillmentStatus === 'PROCESSING' && input.paymentStatus === 'PAID') {
    return input.currentOrderStatus === 'PENDING_PAYMENT' ? 'PROCESSING' : input.currentOrderStatus
  }
  return input.currentOrderStatus
}