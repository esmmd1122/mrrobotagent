import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { createDiscount, updateDiscount } from './actions'

export default async function DiscountsPage() {
  await requireAdmin(PERMISSIONS.DISCOUNTS_MANAGE)
  const discounts = await prisma.discountCode.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">تخفیف‌ها و پروموشن</h1>
      <form action={createDiscount} className="admin-card grid gap-3 p-4 sm:grid-cols-2">
        <input name="code" className="admin-input" placeholder="کد" required />
        <select name="type" className="admin-input" defaultValue="PERCENT">
          <option value="PERCENT">درصدی</option>
          <option value="FIXED">مبلغ ثابت</option>
        </select>
        <input name="value" type="number" className="admin-input" placeholder="مقدار" required />
        <input name="usageLimit" type="number" className="admin-input" placeholder="سقف استفاده (اختیاری)" />
        <input name="startsAt" type="datetime-local" className="admin-input" />
        <input name="expiresAt" type="datetime-local" className="admin-input" />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input name="isActive" type="checkbox" defaultChecked />
          فعال
        </label>
        <button type="submit" className="rounded-lg bg-[#e10600] px-4 py-2 text-sm sm:col-span-2 sm:w-fit">
          ایجاد کد
        </button>
      </form>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>کد</th>
              <th>نوع</th>
              <th>مقدار</th>
              <th>استفاده</th>
              <th>وضعیت</th>
              <th>ویرایش</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((d) => (
              <tr key={d.id}>
                <td dir="ltr">{d.code}</td>
                <td>{d.type}</td>
                <td>{d.value}</td>
                <td>
                  {d.usageCount}
                  {d.usageLimit ? ` / ${d.usageLimit}` : ''}
                </td>
                <td>{d.isActive ? 'فعال' : 'غیرفعال'}</td>
                <td>
                  <form action={updateDiscount.bind(null, d.id)} className="flex flex-wrap gap-1">
                    <input name="code" defaultValue={d.code} className="admin-input w-24" dir="ltr" />
                    <select name="type" defaultValue={d.type} className="admin-input w-20">
                      <option value="PERCENT">%</option>
                      <option value="FIXED">ثابت</option>
                    </select>
                    <input name="value" type="number" defaultValue={d.value} className="admin-input w-16" />
                    <input name="usageLimit" type="number" defaultValue={d.usageLimit ?? ''} className="admin-input w-16" />
                    <input
                      name="startsAt"
                      type="datetime-local"
                      defaultValue={d.startsAt ? new Date(d.startsAt).toISOString().slice(0, 16) : ''}
                      className="admin-input w-36"
                    />
                    <input
                      name="expiresAt"
                      type="datetime-local"
                      defaultValue={d.expiresAt ? new Date(d.expiresAt).toISOString().slice(0, 16) : ''}
                      className="admin-input w-36"
                    />
                    <label className="flex items-center gap-1 text-xs">
                      <input name="isActive" type="checkbox" defaultChecked={d.isActive} />
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
