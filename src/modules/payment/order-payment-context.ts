import { prisma } from '@/lib/db'
import { findOrderByCustomerAccess } from '@/modules/commerce/order-access'

export type OrderPaymentContext = {
  orderId: string
  orderNumber: string
  totalAmount: number
  currency: string
  paymentStatus: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
}

export async function loadOrderPaymentContextForCustomer(
  customerId: string,
  orderNumber: string,
): Promise<OrderPaymentContext | null> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      currency: true,
      paymentStatus: true,
      customer: { select: { name: true, email: true, phone: true } },
    },
  })
  if (!order) return null
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
    customerName: order.customer.name,
    customerEmail: order.customer.email,
    customerPhone: order.customer.phone,
  }
}

export async function loadOrderPaymentContextByViewToken(
  orderNumber: string,
  viewToken: string,
): Promise<OrderPaymentContext | null> {
  const access = await findOrderByCustomerAccess(orderNumber, viewToken)
  if (!access) return null
  const order = await prisma.order.findUnique({
    where: { id: access.id },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      currency: true,
      paymentStatus: true,
      customer: { select: { name: true, email: true, phone: true } },
    },
  })
  if (!order) return null
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
    customerName: order.customer.name,
    customerEmail: order.customer.email,
    customerPhone: order.customer.phone,
  }
}