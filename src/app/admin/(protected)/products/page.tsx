import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'

export default async function AdminProductsPage() {
  await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.productCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">مدیریت محصولات</h1>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-[#e10600] px-4 py-2 text-sm font-semibold"
        >
          محصول جدید
        </Link>
      </div>

      <p className="text-sm text-white/50">
        دسته‌ها: {categories.map((c) => c.nameFa).join(' · ')}
      </p>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full min-w-[720px]">
          <thead>
            <tr>
              <th>نام</th>
              <th>دسته</th>
              <th>قیمت</th>
              <th>نمایش</th>
              <th>ویرایش</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <span dir="ltr">{p.nameEn || p.nameFa}</span>
                </td>
                <td>{p.category.nameFa}</td>
                <td>
                  {p.price != null ? p.price.toLocaleString('fa-IR') : '—'}
                  {p.promoPrice != null ? (
                    <span className="mr-2 text-xs text-[#e10600]">
                      فروش ویژه: {p.promoPrice.toLocaleString('fa-IR')}
                    </span>
                  ) : null}
                </td>
                <td>{p.isVisible ? 'فعال' : 'مخفی'}</td>
                <td>
                  <Link href={`/admin/products/${p.id}`} className="text-[#e10600]">
                    جزئیات
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
