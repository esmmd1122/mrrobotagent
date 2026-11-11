import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { ProductForm } from '@/components/admin/ProductForm'
import { updateProduct, archiveProduct } from '../actions'

type Props = { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const { id } = await params
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.productCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])
  if (!product) notFound()

  const boundUpdate = updateProduct.bind(null, id)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">ویرایش محصول</h1>
      <ProductForm categories={categories} product={product} action={boundUpdate} />
      <form action={archiveProduct.bind(null, id)}>
        <button type="submit" className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-300">
          آرشیو / مخفی کردن
        </button>
      </form>
    </div>
  )
}
