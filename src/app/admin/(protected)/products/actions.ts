'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'
import { STORE_CURRENCY_CODE } from '@/modules/commerce/money'

const optionalMoney = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.coerce.number().nonnegative().nullable(),
)

const productSchema = z.object({
  categoryId: z.string().uuid(),
  slug: z.string().min(2).max(80),
  nameFa: z.string().min(2),
  nameEn: z.string().optional(),
  description: z.string().min(5),
  detailsJson: z.string(),
  featuresJson: z.string(),
  purchaseFieldsJson: z.string().optional(),
  price: optionalMoney,
  promoPrice: optionalMoney,
  imageUrl: z.string().optional(),
  isAvailable: z.coerce.boolean(),
  isFeatured: z.coerce.boolean(),
  isVisible: z.coerce.boolean(),
  sortOrder: z.coerce.number().int(),
})

export async function createProduct(formData: FormData) {
  return saveProduct(formData)
}

export async function updateProduct(productId: string, formData: FormData) {
  return saveProduct(formData, productId)
}

async function saveProduct(formData: FormData, productId?: string) {
  const session = await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)

  const raw = Object.fromEntries(formData.entries())
  const parsed = productSchema.safeParse({
    ...raw,
    isAvailable: raw.isAvailable === 'on',
    isFeatured: raw.isFeatured === 'on',
    isVisible: raw.isVisible === 'on',
  })

  if (!parsed.success) {
    throw new Error('داده محصول نامعتبر است')
  }

  const data = {
    ...parsed.data,
    purchaseFieldsJson: parsed.data.purchaseFieldsJson?.trim() || '[]',
    currency: STORE_CURRENCY_CODE,
  }

  let product
  if (productId) {
    product = await prisma.product.update({
      where: { id: productId },
      data,
    })
    await logActivity({
      adminId: session.sub,
      action: 'product.update',
      entity: 'Product',
      entityId: product.id,
    })
  } else {
    product = await prisma.product.create({ data })
    await logActivity({
      adminId: session.sub,
      action: 'product.create',
      entity: 'Product',
      entityId: product.id,
    })
  }

  revalidatePath('/')
  revalidatePath('/shop')
  revalidatePath(`/subscriptions/${product.slug}`)
  revalidatePath(`/subscriptions/${product.slug}/buy`)
  revalidatePath('/admin/products')
  redirect(`/admin/products/${product.id}`)
}

export async function archiveProduct(productId: string) {
  const session = await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  await prisma.product.update({
    where: { id: productId },
    data: { isVisible: false, isAvailable: false },
  })
  await logActivity({
    adminId: session.sub,
    action: 'product.archive',
    entity: 'Product',
    entityId: productId,
  })
  revalidatePath('/admin/products')
  revalidatePath('/shop')
  revalidatePath('/')
}
