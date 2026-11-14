import { prisma } from '@/lib/db'
import { customerSafeOrderSelect } from './customer-order-fields'

export async function findOrderForCustomerById(customerId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    select: {
      ...customerSafeOrderSelect,
      items: true,
      fulfillment: {
        select: {
          id: true,
          type: true,
          status: true,
          deliveryInfo: true,
          deliveredAt: true,
          failureReason: true,
          assignedAt: true,
          files: {
            select: {
              id: true,
              filename: true,
              mimeType: true,
              sizeBytes: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      payments: {
        select: {
          id: true,
          provider: true,
          status: true,
          amount: true,
          currency: true,
          createdAt: true,
          verifiedAt: true,
        },
      },
    },
  })
  return order
}

export async function listOrdersForCustomer(customerId: string, take = 50) {
  return prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      totalAmount: true,
      currency: true,
      createdAt: true,
    },
  })
}

export async function assertOrderOwnedByCustomer(customerId: string, orderId: string) {
  const row = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    select: { id: true },
  })
  return row != null
}

export { assertNoInternalFields } from './customer-order-sanitize'