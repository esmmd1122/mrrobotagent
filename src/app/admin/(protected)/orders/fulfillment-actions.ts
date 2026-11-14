'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import {
  assignFulfillment,
  attachFulfillmentFile,
  updateFulfillmentNotes,
  updateFulfillmentStatus,
} from '@/modules/fulfillment/service'
import { storeDeliveryFile } from '@/lib/delivery-storage'
import { z } from 'zod'

function mapError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'FULFILLMENT_REQUIRES_PAYMENT') {
      return 'فقط سفارش‌های پرداخت‌شده قابل پردازش تحویل هستند.'
    }
    return error.message
  }
  return 'خطای ناشناخته'
}

export async function assignOrderFulfillment(orderId: string) {
  const session = await requireAdmin(PERMISSIONS.ORDERS_MANAGE)
  try {
    await assignFulfillment({ orderId, adminId: session.sub, adminName: session.name })
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/admin/orders')
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: mapError(e) }
  }
}

const statusSchema = z.object({
  status: z.string(),
  failureReason: z.string().max(2000).optional(),
})

export async function setFulfillmentStatus(orderId: string, formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.ORDERS_MANAGE)
  const parsed = statusSchema.safeParse({
    status: formData.get('status'),
    failureReason: formData.get('failureReason') || undefined,
  })
  if (!parsed.success) return { ok: false as const, error: 'ورودی نامعتبر' }

  try {
    await updateFulfillmentStatus({
      orderId,
      status: parsed.data.status,
      adminId: session.sub,
      failureReason: parsed.data.failureReason,
    })
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/admin/orders')
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: mapError(e) }
  }
}

export async function saveFulfillmentNotes(orderId: string, formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.ORDERS_MANAGE)
  const internalNotes = String(formData.get('internalNotes') ?? '')
  const deliveryInfo = String(formData.get('deliveryInfo') ?? '')

  try {
    await updateFulfillmentNotes({
      orderId,
      adminId: session.sub,
      internalNotes,
      deliveryInfo,
    })
    revalidatePath(`/admin/orders/${orderId}`)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: mapError(e) }
  }
}

export async function uploadFulfillmentDeliveryFile(orderId: string, formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.ORDERS_MANAGE)
  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false as const, error: 'فایل یافت نشد' }

  try {
    const stored = await storeDeliveryFile(file, orderId)
    await attachFulfillmentFile({
      orderId,
      adminId: session.sub,
      ...stored,
    })
    revalidatePath(`/admin/orders/${orderId}`)
    return { ok: true as const }
  } catch (e) {
    if (e instanceof Error && e.message === 'INVALID_FILE_TYPE') {
      return { ok: false as const, error: 'فرمت فایل مجاز نیست (PDF, ZIP, تصویر، TXT).' }
    }
    if (e instanceof Error && e.message === 'FILE_TOO_LARGE') {
      return { ok: false as const, error: 'حداکثر حجم فایل ۱۰ مگابایت است.' }
    }
    return { ok: false as const, error: mapError(e) }
  }
}