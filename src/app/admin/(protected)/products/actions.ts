'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'
import { STORE_CURRENCY_CODE } from '@/modules/commerce/money'
import { normalizeAndValidateProductImageUrl } from '@/lib/storage-validation'

export type ProductActionState = {
  ok: false
  error: string
  fieldErrors?: Partial<Record<'imageUrl' | 'slug' | 'detailsJson' | 'featuresJson' | 'purchaseFieldsJson' | 'form', string>>
} | null

const optionalMoney = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.coerce.number().nonnegative().nullable(),
)

const productSchema = z.object({
  categoryId: z.string().uuid('دسته‌بندی انتخاب‌شده معتبر نیست.'),
  slug: z
    .string()
    .trim()
    .min(2, 'نشانی یکتا (Slug) باید حداقل ۲ کاراکتر باشد.')
    .max(80, 'نشانی یکتا (Slug) نباید بیشتر از ۸۰ کاراکتر باشد.'),
  nameFa: z.string().trim().min(2, 'نام فارسی محصول باید حداقل ۲ کاراکتر باشد.'),
  nameEn: z.string().optional(),
  description: z.string().trim().min(5, 'توضیح محصول باید حداقل ۵ کاراکتر باشد.'),
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

function isValidJsonArray(raw: string): boolean {
  try {
    return Array.isArray(JSON.parse(raw))
  } catch {
    return false
  }
}

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  return saveProduct(formData)
}

export async function updateProduct(
  productId: string,
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  return saveProduct(formData, productId)
}

async function saveProduct(
  formData: FormData,
  productId?: string,
): Promise<ProductActionState> {
  const session = await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)

  const raw = Object.fromEntries(formData.entries())
  const parsed = productSchema.safeParse({
    ...raw,
    isAvailable: raw.isAvailable === 'on',
    isFeatured: raw.isFeatured === 'on',
    isVisible: raw.isVisible === 'on',
  })

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return {
      ok: false,
      error: firstIssue?.message || 'داده‌های فرم محصول کامل یا معتبر نیستند.',
    }
  }

  const existingProduct = productId
    ? await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, imageUrl: true },
      })
    : null

  if (productId && !existingProduct) {
    return { ok: false, error: 'محصول مورد نظر برای ویرایش یافت نشد.' }
  }

  const imageValidation = normalizeAndValidateProductImageUrl(parsed.data.imageUrl, {
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
    legacyExistingUrl: existingProduct?.imageUrl ?? null,
  })

  if (!imageValidation.ok) {
    return {
      ok: false,
      error: imageValidation.messageFa,
      fieldErrors: { imageUrl: imageValidation.messageFa },
    }
  }

  const detailsJson = parsed.data.detailsJson.trim() || '[]'
  if (!isValidJsonArray(detailsJson)) {
    const msg = 'فیلد جزئیات محصول باید یک آرایه JSON معتبر باشد (مثلاً ["مورد ۱"]).'
    return { ok: false, error: msg, fieldErrors: { detailsJson: msg } }
  }

  const featuresJson = parsed.data.featuresJson.trim() || '[]'
  if (!isValidJsonArray(featuresJson)) {
    const msg = 'فیلد ویژگی‌ها و مزایا باید یک آرایه JSON معتبر باشد.'
    return { ok: false, error: msg, fieldErrors: { featuresJson: msg } }
  }

  const purchaseFieldsJson = parsed.data.purchaseFieldsJson?.trim() || '[]'
  if (!isValidJsonArray(purchaseFieldsJson)) {
    const msg = 'فیلدهای اختصاصی خرید باید یک آرایه JSON معتبر باشد.'
    return { ok: false, error: msg, fieldErrors: { purchaseFieldsJson: msg } }
  }

  const data = {
    ...parsed.data,
    nameEn: parsed.data.nameEn?.trim() || null,
    detailsJson,
    featuresJson,
    imageUrl: imageValidation.url,
    purchaseFieldsJson,
    currency: STORE_CURRENCY_CODE,
  }

  let product
  try {
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
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : ''
    if (code === 'P2002') {
      const msg = 'این نشانی یکتا (Slug) قبلاً برای محصول دیگری ثبت شده است.'
      return { ok: false, error: msg, fieldErrors: { slug: msg } }
    }
    return {
      ok: false,
      error: 'خطا در ذخیره محصول در پایگاه داده. لطفاً داده‌ها را بررسی و دوباره تلاش کنید.',
    }
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

export async function deleteProductAction(productId: string): Promise<{
  ok: boolean
  hasOrders?: boolean
  error?: string
}> {
  const session = await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, nameFa: true },
  })
  if (!existing) {
    return { ok: false, error: 'محصول مورد نظر یافت نشد.' }
  }

  const linkedOrderItems = await prisma.orderItem.count({
    where: { productId },
  })
  if (linkedOrderItems > 0) {
    return {
      ok: false,
      hasOrders: true,
      error: `این محصول در ${linkedOrderItems.toLocaleString('fa-IR')} آیتم سفارش ثبت شده است و برای حفظ سابقه سفارش‌ها نمی‌توان آن را کاملاً حذف کرد. می‌توانید آن را آرشیو و مخفی کنید.`,
    }
  }

  await prisma.product.delete({ where: { id: productId } })
  await logActivity({
    adminId: session.sub,
    action: 'product.delete',
    entity: 'Product',
    entityId: productId,
    metadata: { slug: existing.slug, nameFa: existing.nameFa },
  })

  revalidatePath('/')
  revalidatePath('/shop')
  revalidatePath(`/subscriptions/${existing.slug}`)
  revalidatePath('/admin/products')
  return { ok: true }
}
