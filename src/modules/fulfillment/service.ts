import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import {
  assertFulfillmentTransition,
  canAssignFulfillment,
  deriveOrderStatusAfterFulfillment,
  type FulfillmentStatus,
} from './rules'
import { isFulfillmentStatus } from './labels'
import { notifyCustomer, copyForNotificationType } from '../notifications/service'

async function notifyFulfillment(
  customerId: string,
  orderId: string,
  orderNumber: string,
  type: 'ORDER_PROCESSING' | 'INFO_REQUIRED' | 'DELIVERY_READY' | 'FULFILLMENT_FAILED',
) {
  const copy = copyForNotificationType(type, orderNumber)
  await notifyCustomer({ customerId, orderId, type, title: copy.title, body: copy.body })
}

export async function ensureFulfillmentForOrder(orderId: string) {
  const existing = await prisma.orderFulfillment.findUnique({ where: { orderId } })
  if (existing) return existing
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { fulfillmentType: true } })
  return prisma.orderFulfillment.create({
    data: {
      orderId,
      type: order?.fulfillmentType || 'MANUAL',
      status: 'PENDING',
    },
  })
}

async function syncOrderFulfillmentStatus(orderId: string, status: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { fulfillmentStatus: status },
  })
}

export async function assignFulfillment(input: {
  orderId: string
  adminId: string
  adminName: string
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { fulfillment: true },
  })
  if (!order) throw new Error('ORDER_NOT_FOUND')
  if (!canAssignFulfillment(order.paymentStatus)) {
    throw new Error('FULFILLMENT_REQUIRES_PAYMENT')
  }

  const fulfillment = order.fulfillment ?? (await ensureFulfillmentForOrder(order.id))
  const wasPending = fulfillment.status === 'PENDING'

  const updated = await prisma.orderFulfillment.update({
    where: { id: fulfillment.id },
    data: {
      assignedAdminId: input.adminId,
      assignedAt: new Date(),
      status: fulfillment.status === 'PENDING' ? 'PROCESSING' : fulfillment.status,
    },
  })

  if (updated.status === 'PROCESSING') {
    await syncOrderFulfillmentStatus(order.id, 'PROCESSING')
  }

  await logActivity({
    adminId: input.adminId,
    action: 'fulfillment.assign',
    entity: 'OrderFulfillment',
    entityId: updated.id,
    metadata: { orderId: order.id, adminName: input.adminName },
  })

  if (wasPending && updated.status === 'PROCESSING') {
    await notifyFulfillment(order.customerId, order.id, order.orderNumber, 'ORDER_PROCESSING')
  }

  return updated
}

export async function updateFulfillmentStatus(input: {
  orderId: string
  status: string
  adminId: string
  failureReason?: string
}) {
  if (!isFulfillmentStatus(input.status)) throw new Error('INVALID_STATUS')

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { fulfillment: true },
  })
  if (!order) throw new Error('ORDER_NOT_FOUND')

  const check = assertFulfillmentTransition(order.paymentStatus, input.status as FulfillmentStatus)
  if (!check.ok) throw new Error(check.reason)

  const fulfillment = order.fulfillment ?? (await ensureFulfillmentForOrder(order.id))

  const deliveredAt =
    input.status === 'COMPLETED' ? new Date() : input.status === 'FAILED' ? null : fulfillment.deliveredAt

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.orderFulfillment.update({
      where: { id: fulfillment.id },
      data: {
        status: input.status,
        failureReason: input.status === 'FAILED' ? input.failureReason || 'ناموفق' : null,
        deliveredAt,
      },
    })
    const nextOrderStatus = deriveOrderStatusAfterFulfillment({
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: input.status as FulfillmentStatus,
      currentOrderStatus: order.status,
    })
    await tx.order.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: input.status,
        status: nextOrderStatus,
      },
    })
    return row
  })

  await logActivity({
    adminId: input.adminId,
    action: 'fulfillment.status_change',
    entity: 'OrderFulfillment',
    entityId: updated.id,
    metadata: {
      orderId: order.id,
      from: fulfillment.status,
      to: input.status,
    },
  })

  if (input.status === 'COMPLETED') {
    await logActivity({
      adminId: input.adminId,
      action: 'fulfillment.completed',
      entity: 'OrderFulfillment',
      entityId: updated.id,
      metadata: { orderId: order.id },
    })
  }
  if (input.status === 'FAILED') {
    await logActivity({
      adminId: input.adminId,
      action: 'fulfillment.failed',
      entity: 'OrderFulfillment',
      entityId: updated.id,
      metadata: { orderId: order.id, reason: input.failureReason },
    })
  }

  if (input.status === 'WAITING_FOR_CUSTOMER') {
    await notifyFulfillment(order.customerId, order.id, order.orderNumber, 'INFO_REQUIRED')
  } else if (input.status === 'COMPLETED') {
    await notifyFulfillment(order.customerId, order.id, order.orderNumber, 'DELIVERY_READY')
  } else if (input.status === 'FAILED') {
    await notifyFulfillment(order.customerId, order.id, order.orderNumber, 'FULFILLMENT_FAILED')
  } else if (input.status === 'PROCESSING' && fulfillment.status === 'PENDING') {
    await notifyFulfillment(order.customerId, order.id, order.orderNumber, 'ORDER_PROCESSING')
  }

  return updated
}

export async function updateFulfillmentNotes(input: {
  orderId: string
  adminId: string
  internalNotes?: string
  deliveryInfo?: string
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { fulfillment: true },
  })
  if (!order) throw new Error('ORDER_NOT_FOUND')

  const fulfillment = order.fulfillment ?? (await ensureFulfillmentForOrder(order.id))

  const updated = await prisma.orderFulfillment.update({
    where: { id: fulfillment.id },
    data: {
      ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
      ...(input.deliveryInfo !== undefined ? { deliveryInfo: input.deliveryInfo } : {}),
    },
  })

  if (input.deliveryInfo !== undefined) {
    await prisma.order.update({
      where: { id: order.id },
      data: { deliveryInfo: input.deliveryInfo },
    })
    await logActivity({
      adminId: input.adminId,
      action: 'fulfillment.delivery_updated',
      entity: 'OrderFulfillment',
      entityId: updated.id,
      metadata: { orderId: order.id },
    })
  }

  if (input.internalNotes !== undefined) {
    await logActivity({
      adminId: input.adminId,
      action: 'fulfillment.notes_updated',
      entity: 'OrderFulfillment',
      entityId: updated.id,
      metadata: { orderId: order.id },
    })
  }

  return updated
}

export async function attachFulfillmentFile(input: {
  orderId: string
  adminId: string
  filename: string
  url: string
  mimeType: string
  sizeBytes: number
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { fulfillment: true },
  })
  if (!order) throw new Error('ORDER_NOT_FOUND')
  if (order.paymentStatus !== 'PAID') throw new Error('FULFILLMENT_REQUIRES_PAYMENT')

  const fulfillment = order.fulfillment ?? (await ensureFulfillmentForOrder(order.id))

  const file = await prisma.orderFulfillmentFile.create({
    data: {
      fulfillmentId: fulfillment.id,
      filename: input.filename,
      url: input.url,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedByAdminId: input.adminId,
    },
  })

  await logActivity({
    adminId: input.adminId,
    action: 'fulfillment.file_uploaded',
    entity: 'OrderFulfillmentFile',
    entityId: file.id,
    metadata: { orderId: order.id, filename: input.filename },
  })

  return file
}