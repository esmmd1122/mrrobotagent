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
  usageLimit: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
  startsAt: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.date().optional(),
  ),
  expiresAt: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.date().optional(),
  ),
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
      startsAt: parsed.data.startsAt,
      expiresAt: parsed.data.expiresAt,
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

export async function updateDiscount(discountId: string, formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.DISCOUNTS_MANAGE)
  const parsed = schema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get('isActive') === 'on',
  })
  if (!parsed.success) throw new Error('ورودی نامعتبر')

  await prisma.discountCode.update({
    where: { id: discountId },
    data: {
      code: parsed.data.code.toUpperCase(),
      type: parsed.data.type,
      value: parsed.data.value,
      usageLimit: parsed.data.usageLimit,
      startsAt: parsed.data.startsAt,
      expiresAt: parsed.data.expiresAt,
      isActive: parsed.data.isActive,
    },
  })

  await logActivity({
    adminId: session.sub,
    action: 'discount.update',
    entity: 'DiscountCode',
    entityId: discountId,
  })
  revalidatePath('/admin/discounts')
}
