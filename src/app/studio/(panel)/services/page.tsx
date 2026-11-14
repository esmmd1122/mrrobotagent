import { prisma } from '@/lib/db'
import { getStudioSession } from '@/modules/salon/auth'
import { toman } from '@/modules/salon/format'
import { addOffering, deactivateOffering } from '@/app/studio/actions'
import { redirect } from 'next/navigation'

export default async function ServicesPage() {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  const [offerings, employees] = await Promise.all([
    prisma.salonOffering.findMany({
      where: { businessId: session.businessId },
      include: { employees: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.salonEmployee.findMany({ where: { businessId: session.businessId, isActive: true } }),
  ])
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">خدمات</h1>
      <ul className="space-y-2 text-sm">
        {offerings.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
            <span>
              {item.name} — {toman(item.priceToman)} — {item.durationMinutes} دقیقه
              {!item.isActive && ' (غیرفعال)'}
            </span>
            <form action={deactivateOffering}>
              <input type="hidden" name="id" value={item.id} />
              <button className="text-xs text-red-300">حذف / غیرفعال</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={addOffering} className="grid gap-2 rounded-xl border border-white/10 p-4">
        <input name="name" required placeholder="نام خدمت" className="rounded bg-white/5 px-3 py-2" />
        <textarea name="description" placeholder="توضیح" className="rounded bg-white/5 px-3 py-2" />
        <input name="price" type="number" required placeholder="قیمت تومان" className="rounded bg-white/5 px-3 py-2" />
        <input name="duration" type="number" required placeholder="مدت دقیقه" className="rounded bg-white/5 px-3 py-2" />
        <div className="flex flex-wrap gap-3 text-sm">
          {employees.map((e) => (
            <label key={e.id} className="flex items-center gap-1">
              <input type="checkbox" name="employeeId" value={e.id} />
              {e.name}
            </label>
          ))}
        </div>
        <button className="w-fit rounded bg-[#e10600] px-4 py-2">افزودن خدمت</button>
      </form>
    </section>
  )
}
