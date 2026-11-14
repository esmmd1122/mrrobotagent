'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'

const categorySchema = z.object({
  slug: z.string().min(2).max(80),
  nameFa: z.string().min(2),
  nameEn: z.string().optional(),
  sortOrder: z.coerce.number().int(),
  isActive: z.coerce.boolean(),
})

export async function saveCategory(formData: FormData, categoryId?: string) {
  const session = await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const parsed = categorySchema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get('isActive') === 'on',
  })
  if (!parsed.success) throw new Error('دسته نامعتبر')

  const row = categoryId
    ? await prisma.productCategory.update({ where: { id: categoryId }, data: parsed.data })
    : await prisma.productCategory.create({ data: parsed.data })

  await logActivity({
    adminId: session.sub,
    action: categoryId ? 'category.update' : 'category.create',
    entity: 'ProductCategory',
    entityId: row.id,
  })
  revalidatePath('/admin/categories')
  revalidatePath('/admin/products')
  revalidatePath('/shop')
}

export async function updateCategory(categoryId: string, formData: FormData) {
  await saveCategory(formData, categoryId)
}