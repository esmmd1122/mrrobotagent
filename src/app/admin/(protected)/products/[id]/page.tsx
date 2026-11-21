import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { ProductForm } from '@/components/admin/ProductForm'
import { ProductPlansPanel } from '@/components/admin/ProductPlansPanel'
import { AdminProductPricePreview } from '@/components/admin/AdminProductPricePreview'
import { ProductDeleteButton } from '@/components/admin/ProductDeleteButton'
import { updateProduct, archiveProduct } from '../actions'

type Props = { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const { id } = await params
  const [product, categories, mediaAssets] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { plans: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    }),
    prisma.productCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
  ])
  if (!product) notFound()

  const boundUpdate = updateProduct.bind(null, id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>بازگشت به لیست محصولات</span>
          </Link>
          <h1 className="mt-1 text-xl font-bold">ویرایش محصول: {product.nameFa}</h1>
        </div>
        <Link
          href={`/subscriptions/${product.slug}`}
          className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10"
        >
          مشاهده در فروشگاه
        </Link>
      </div>

      <AdminProductPricePreview
        price={product.price}
        promoPrice={product.promoPrice}
        isVisible={product.isVisible}
        isAvailable={product.isAvailable}
      />

      <ProductForm
        categories={categories}
        product={product}
        mediaLibrary={mediaAssets.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          sizeBytes: m.sizeBytes,
          altText: m.altText,
        }))}
        action={boundUpdate}
      />

      <ProductPlansPanel product={product} plans={product.plans} />

      <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-4">
        <form action={archiveProduct.bind(null, id)}>
          <button
            type="submit"
            className="rounded-lg border border-amber-500/45 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20"
          >
            آرشیو و مخفی کردن محصول
          </button>
        </form>
        <ProductDeleteButton
          productId={product.id}
          productName={product.nameFa}
          redirectAfter="/admin/products"
        />
      </div>
    </div>
  )
}
