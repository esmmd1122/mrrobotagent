export const SESSION_COOKIE = 'mr_robot_admin_session'

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  PRODUCTS_MANAGE: 'products:manage',
  ORDERS_MANAGE: 'orders:manage',
  CUSTOMERS_VIEW: 'customers:view',
  PAYMENTS_VIEW: 'payments:view',
  AI_MANAGE: 'ai:manage',
  SUPPORT_MANAGE: 'support:manage',
  CONTENT_MANAGE: 'content:manage',
  DISCOUNTS_MANAGE: 'discounts:manage',
  ADMINS_MANAGE: 'admins:manage',
  ACTIVITY_VIEW: 'activity:view',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSIONS = Object.values(PERMISSIONS)

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'در انتظار پرداخت',
  PAID: 'پرداخت شده',
  PROCESSING: 'در حال پردازش',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
  REFUNDED: 'مسترد شده',
}
