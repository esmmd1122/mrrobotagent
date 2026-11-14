export const CUSTOMER_NOTIFICATION_TYPES = [
  'ORDER_REGISTERED',
  'PAYMENT_CONFIRMED',
  'ORDER_PROCESSING',
  'INFO_REQUIRED',
  'DELIVERY_READY',
  'FULFILLMENT_FAILED',
] as const

export type CustomerNotificationType = (typeof CUSTOMER_NOTIFICATION_TYPES)[number]

export const NOTIFICATION_CHANNELS = ['IN_APP', 'EMAIL', 'SMS'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]