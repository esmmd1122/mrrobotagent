import { prisma } from '@/lib/db'
import { verifyOrderViewToken } from './view-token'
import { customerSafeOrderSelect } from './customer-order-fields'

export { hashOrderViewToken, verifyOrderViewToken } from './view-token'

const trackOrderInclude = {
  items: true,
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
        orderBy: { createdAt: 'desc' as const },
      },
    },
  },
} as const

export async function findOrderByCustomerAccess(orderNumber: string, viewToken: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      ...customerSafeOrderSelect,
      customerViewTokenHash: true,
      ...trackOrderInclude,
    },
  })
  if (!order?.customerViewTokenHash) return null
  if (!verifyOrderViewToken(viewToken, order.customerViewTokenHash)) return null
  const { customerViewTokenHash: _hash, ...safe } = order
  return safe
}