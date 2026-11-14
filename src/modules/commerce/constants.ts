export const CART_COOKIE = 'mr_robot_cart'

export const FULFILLMENT_TYPES = ['MANUAL', 'AUTOMATIC'] as const

export const FULFILLMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'WAITING_FOR_CUSTOMER',
  'COMPLETED',
  'FAILED',
] as const

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number]