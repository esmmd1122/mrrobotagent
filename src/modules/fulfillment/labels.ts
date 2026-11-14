import { FULFILLMENT_STATUSES } from '../commerce/constants'

export const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  PROCESSING: 'در حال پردازش',
  WAITING_FOR_CUSTOMER: 'منتظر مشتری',
  COMPLETED: 'تحویل شده',
  FAILED: 'ناموفق',
}

export function isFulfillmentStatus(value: string): boolean {
  return (FULFILLMENT_STATUSES as readonly string[]).includes(value)
}