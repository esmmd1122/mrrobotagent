'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'
import { isPlanDurationUnit } from '@/modules/commerce/plan-labels'

const planSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().nonnegative(),
  promoPrice: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().nonnegative().nullable(),
  ),
  durationValue: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int().positive().nullable(),
  ),
  durationUnit: z.string(),
  fulfillmentInstructions: z.string().max(5000).optional(),
  sortOrder: z.coerce.number().int(),
  isActive: z.coerce.boolean(),
  isFeatured: z.coerce.boolean(),
})

function parsePlanForm(formData: FormData) {
  return planSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || '',
    price: formData.get('price'),
    promoPrice: formData.get('promoPrice'),
    durationValue: formData.get('durationValue'),
    durationUnit: formData.get('durationUnit'),
    fulfillmentInstructions: formData.get('fulfillmentInstructions') || '',
    sortOrder: formData.get('sortOrder') ?? 0,
    isActive: formData.get('isActive') === 'on',
    isFeatured: formData.get('isFeatured') === 'on',
  })
}

export async function setProductPlansEnabled(productId: string, enabled: boolean) {
  const session = await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const product = await prisma.product.update({
    where: { id: productId },
    data: { plansEnabled: enabled },
    select: { slug: true },
  })
  await logActivity({
    adminId: session.sub,
    action: 'product.plans_enabled',
    entity: 'Product',
    entityId: productId,
    metadata: { enabled },
  })
  revalidatePath(`/admin/products/${productId}`)
  revalidatePath(`/subscriptions/${product.slug}`)
}

export async function createProductPlan(productId: string, formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const parsed = parsePlanForm(formData)
  if (!parsed.success || !isPlanDurationUnit(parsed.data.durationUnit)) {
    throw new Error('طرح نامعتبر است')
  }
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } })
  if (!product) throw new Error('محصول یافت نشد')

  const plan = await prisma.productPlan.create({
    data: {
      productId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      price: parsed.data.price,
      promoPrice: parsed.data.promoPrice,
      durationValue: parsed.data.durationUnit === 'LIFETIME' ? null : parsed.data.durationValue,
      durationUnit: parsed.data.durationUnit,
      fulfillmentInstructions: parsed.data.fulfillmentInstructions || null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      isFeatured: parsed.data.isFeatured,
    },
  })

  await logActivity({
    adminId: session.sub,
    action: 'product_plan.create',
    entity: 'ProductPlan',
    entityId: plan.id,
    metadata: { productId },
  })
  revalidatePath(`/admin/products/${productId}`)
  revalidatePath(`/subscriptions/${product.slug}`)
}

export async function updateProductPlan(planId: string, formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const parsed = parsePlanForm(formData)
  if (!parsed.success || !isPlanDurationUnit(parsed.data.durationUnit)) {
    throw new Error('طرح نامعتبر است')
  }
  const existing = await prisma.productPlan.findUnique({
    where: { id: planId },
    include: { product: { select: { slug: true } } },
  })
  if (!existing) throw new Error('طرح یافت نشد')

  await prisma.productPlan.update({
    where: { id: planId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      price: parsed.data.price,
      promoPrice: parsed.data.promoPrice,
      durationValue: parsed.data.durationUnit === 'LIFETIME' ? null : parsed.data.durationValue,
      durationUnit: parsed.data.durationUnit,
      fulfillmentInstructions: parsed.data.fulfillmentInstructions || null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      isFeatured: parsed.data.isFeatured,
    },
  })

  await logActivity({
    adminId: session.sub,
    action: 'product_plan.update',
    entity: 'ProductPlan',
    entityId: planId,
    metadata: { productId: existing.productId },
  })
  revalidatePath(`/admin/products/${existing.productId}`)
  revalidatePath(`/subscriptions/${existing.product.slug}`)
}

export async function deleteProductPlan(planId: string) {
  const session = await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const plan = await prisma.productPlan.findUnique({
    where: { id: planId },
    include: { product: { select: { slug: true } }, _count: { select: { orderItems: true } } },
  })
  if (!plan) throw new Error('طرح یافت نشد')
  if (plan._count.orderItems > 0) {
    throw new Error('این طرح در سفارش‌ها استفاده شده و قابل حذف نیست؛ آن را غیرفعال کنید.')
  }

  await prisma.productPlan.delete({ where: { id: planId } })
  await logActivity({
    adminId: session.sub,
    action: 'product_plan.delete',
    entity: 'ProductPlan',
    entityId: planId,
    metadata: { productId: plan.productId },
  })
  revalidatePath(`/admin/products/${plan.productId}`)
  revalidatePath(`/subscriptions/${plan.product.slug}`)
}