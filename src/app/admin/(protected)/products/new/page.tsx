import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { ProductForm } from '@/components/admin/ProductForm'
import { AdminProductPricePreview } from '@/components/admin/AdminProductPricePreview'
import { createProduct } from '../actions'

export default async function NewProductPage() {
  await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const [categories, mediaAssets] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
  ])

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>بازگشت به لیست محصولات</span>
        </Link>
        <h1 className="mt-1 text-xl font-bold">افزودن محصول جدید</h1>
      </div>
      <AdminProductPricePreview price={null} promoPrice={null} isVisible isAvailable />
      <ProductForm
        categories={categories}
        mediaLibrary={mediaAssets.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          sizeBytes: m.sizeBytes,
          altText: m.altText,
        }))}
        action={createProduct}
      />
    </div>
  )
}
