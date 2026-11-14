/** Gateway / Payment record lifecycle — independent from Order.fulfillmentStatus */
export const PAYMENT_RECORD_STATUSES = [
  'INITIATED',
  'REDIRECTED',
  'PENDING_VERIFY',
  'VERIFIED',
  'FAILED',
  'CANCELLED',
] as const

export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number]

export const PAYMENT_TX_TYPES = [
  'INITIATE',
  'REDIRECT',
  'CALLBACK',
  'VERIFY',
  'VERIFY_FAILED',
  'ERROR',
] as const