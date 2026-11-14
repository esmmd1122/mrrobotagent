import { readFulfillmentStoredBytes } from '@/lib/delivery/read-stored-bytes'
import { findOrderByCustomerAccess } from '@/modules/commerce/order-access'
import { prisma } from '@/lib/db'
import {
  verifyFileDownloadGrant,
  verifyCustomerSessionFileGrant,
  createFileDownloadGrantForCustomer,
} from './file-download-grant'
export {
  createFileDownloadGrant,
  verifyFileDownloadGrant,
  createFileDownloadGrantForCustomer,
} from './file-download-grant'

export async function resolveCustomerFulfillmentFile(
  fileId: string,
  orderNumber: string,
  viewToken: string,
  grant: { exp: number; sig: string },
) {
  if (!verifyFileDownloadGrant(fileId, orderNumber, viewToken, grant.exp, grant.sig)) {
    return { ok: false as const, code: 'FORBIDDEN' }
  }

  const order = await findOrderByCustomerAccess(orderNumber, viewToken)
  if (!order?.fulfillment) return { ok: false as const, code: 'FORBIDDEN' }

  const file = order.fulfillment.files.find((f) => f.id === fileId)
  if (!file) return { ok: false as const, code: 'NOT_FOUND' }

  return { ok: true as const, file }
}

export async function resolveCustomerFulfillmentFileForSession(
  fileId: string,
  orderNumber: string,
  customerId: string,
  grant: { exp: number; sig: string },
) {
  if (!verifyCustomerSessionFileGrant(fileId, orderNumber, customerId, grant.exp, grant.sig)) {
    return { ok: false as const, code: 'FORBIDDEN' }
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId },
    include: { fulfillment: { include: { files: true } } },
  })
  if (!order?.fulfillment) return { ok: false as const, code: 'FORBIDDEN' }
  if (order.paymentStatus !== 'PAID') return { ok: false as const, code: 'FORBIDDEN' }

  const file = order.fulfillment.files.find((f) => f.id === fileId)
  if (!file) return { ok: false as const, code: 'NOT_FOUND' }

  return { ok: true as const, file }
}

export function buildSessionFileDownloadUrl(
  fileId: string,
  orderNumber: string,
  customerId: string,
  grant: { exp: number; sig: string },
) {
  const q = new URLSearchParams({
    orderNumber,
    auth: 'session',
    exp: String(grant.exp),
    sig: grant.sig,
  })
  return `/api/store/fulfillment/files/${fileId}/download?${q.toString()}`
}

export async function resolveAdminFulfillmentFile(fileId: string) {
  const file = await prisma.orderFulfillmentFile.findUnique({
    where: { id: fileId },
    include: { fulfillment: { include: { order: true } } },
  })
  if (!file) return null
  return file
}

export async function readStoredFileBytes(storedUrl: string) {
  return readFulfillmentStoredBytes(storedUrl)
}

export function buildCustomerFileDownloadUrl(
  fileId: string,
  orderNumber: string,
  viewToken: string,
  grant: { exp: number; sig: string },
) {
  const q = new URLSearchParams({
    orderNumber,
    token: viewToken,
    exp: String(grant.exp),
    sig: grant.sig,
  })
  return `/api/store/fulfillment/files/${fileId}/download?${q.toString()}`
}