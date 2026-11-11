'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

const schema = z.object({
  code: z.string().min(3).max(32),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.coerce.number().positive(),
  usageLimit: z.coerce.number().int().positive().optional(),
  isActive: z.boolean(),
})

export async function createDiscount(formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.DISCOUNTS_MANAGE)
  const parsed = schema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get('isActive') === 'on',
  })
  if (!parsed.success) throw new Error('ورودی نامعتبر')

  const discount = await prisma.discountCode.create({
    data: {
      code: parsed.data.code.toUpperCase(),
      type: parsed.data.type,
      value: parsed.data.value,
      usageLimit: parsed.data.usageLimit,
      isActive: parsed.data.isActive,
    },
  })

  await logActivity({
    adminId: session.sub,
    action: 'discount.create',
    entity: 'DiscountCode',
    entityId: discount.id,
  })

  revalidatePath('/admin/discounts')
}
