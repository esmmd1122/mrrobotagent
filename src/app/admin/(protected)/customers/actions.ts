'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED']),
})

export async function updateCustomerStatus(customerId: string, formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.CUSTOMERS_VIEW)
  const parsed = statusSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('وضعیت نامعتبر')

  await prisma.customer.update({
    where: { id: customerId },
    data: { status: parsed.data.status },
  })

  await logActivity({
    adminId: session.sub,
    action: 'customer.status_update',
    entity: 'Customer',
    entityId: customerId,
    metadata: parsed.data,
  })
  revalidatePath(`/admin/customers/${customerId}`)
}