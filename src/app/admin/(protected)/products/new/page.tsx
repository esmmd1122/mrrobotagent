import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { ProductForm } from '@/components/admin/ProductForm'
import { createProduct } from '../actions'

export default async function NewProductPage() {
  await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const categories = await prisma.productCategory.findMany({ orderBy: { sortOrder: 'asc' } })

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">افزودن محصول</h1>
      <ProductForm categories={categories} action={createProduct} />
    </div>
  )
}
