import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { saveCategory, updateCategory } from './actions'

export default async function CategoriesPage() {
  await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const categories = await prisma.productCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">دسته‌های محصول</h1>
      <form action={saveCategory} className="admin-card grid gap-3 p-4 sm:grid-cols-2">
        <input name="slug" placeholder="slug" className="admin-input" required />
        <input name="nameFa" placeholder="نام فارسی" className="admin-input" required />
        <input name="nameEn" placeholder="نام انگلیسی" className="admin-input" />
        <input name="sortOrder" type="number" defaultValue={0} className="admin-input" />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input name="isActive" type="checkbox" defaultChecked />
          فعال
        </label>
        <button type="submit" className="rounded-lg bg-[#e10600] px-4 py-2 text-sm sm:col-span-2 sm:w-fit">
          افزودن دسته
        </button>
      </form>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>slug</th>
              <th>نام</th>
              <th>محصول</th>
              <th>فعال</th>
              <th>ویرایش</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td dir="ltr">{c.slug}</td>
                <td>{c.nameFa}</td>
                <td>{c._count.products}</td>
                <td>{c.isActive ? 'بله' : 'خیر'}</td>
                <td>
                  <form action={updateCategory.bind(null, c.id)} className="flex flex-wrap items-center gap-1">
                    <input name="slug" defaultValue={c.slug} className="admin-input w-24" dir="ltr" required />
                    <input name="nameFa" defaultValue={c.nameFa} className="admin-input w-28" required />
                    <input name="nameEn" defaultValue={c.nameEn ?? ''} className="admin-input w-24" />
                    <input name="sortOrder" type="number" defaultValue={c.sortOrder} className="admin-input w-14" />
                    <label className="flex items-center gap-1 text-xs">
                      <input name="isActive" type="checkbox" defaultChecked={c.isActive} />
                      فعال
                    </label>
                    <button type="submit" className="text-xs text-[#e10600]">
                      ذخیره
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}