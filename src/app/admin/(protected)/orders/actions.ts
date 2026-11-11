'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS, ORDER_STATUSES } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

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

  await prisma.order.update({
    where: { id: orderId },
    data: parsed.data,
  })

  await logActivity({
    adminId: session.sub,
    action: 'order.update',
    entity: 'Order',
    entityId: orderId,
    metadata: parsed.data,
  })

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin')
}
