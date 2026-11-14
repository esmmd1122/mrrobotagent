'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS, ORDER_STATUSES } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { validateAdminOrderPaymentUpdate } from '@/modules/payment/payment-integrity'

const schema = z.object({
  status: z
    .string()
    .refine((v) => (ORDER_STATUSES as readonly string[]).includes(v)),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'FAILED', 'REFUNDED']),
  adminNotes: z.string().max(5000).optional(),
  deliveryInfo: z.string().max(2000).optional(),
})

export async function updateOrder(orderId: string, formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.ORDERS_MANAGE)
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('ورودی نامعتبر')

  const current = await prisma.order.findUnique({ where: { id: orderId } })
  if (!current) throw new Error('سفارش یافت نشد')

  const nextPayment = parsed.data.paymentStatus
  const nextStatus = parsed.data.status
  if (nextStatus === 'COMPLETED' && nextPayment !== 'PAID' && current.paymentStatus !== 'PAID') {
    throw new Error('تکمیل سفارش بدون پرداخت تأیید‌شده مجاز نیست.')
  }

  const verifiedCount = await prisma.payment.count({
    where: { orderId, status: 'VERIFIED' },
  })
  const payCheck = validateAdminOrderPaymentUpdate({
    nextPaymentStatus: nextPayment,
    hasVerifiedPayment: verifiedCount > 0,
  })
  if (!payCheck.ok) throw new Error(payCheck.message)

  let paymentStatus = nextPayment
  if (nextPayment === 'PAID') {
    paymentStatus = 'PAID'
  } else if (current.paymentStatus === 'PAID' && verifiedCount > 0 && nextPayment !== 'REFUNDED') {
    throw new Error('سفارش دارای پرداخت تأیید‌شده — فقط تغییر به REFUNDED مجاز است.')
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: nextStatus,
      paymentStatus,
      adminNotes: parsed.data.adminNotes,
      deliveryInfo: parsed.data.deliveryInfo,
    },
  })

  await logActivity({
    adminId: session.sub,
    action: 'order.update',
    entity: 'Order',
    entityId: orderId,
    metadata: { ...parsed.data, paymentStatus },
  })

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin')
}
