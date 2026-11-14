import { prisma } from '@/lib/db'
import { getStudioSession } from '@/modules/salon/auth'
import { addEmployee } from '@/app/studio/actions'
import { redirect } from 'next/navigation'

export default async function TeamPage() {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  const employees = await prisma.salonEmployee.findMany({
    where: { businessId: session.businessId },
    include: { hours: true },
  })
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">پرسنل</h1>
      <ul className="space-y-2 text-sm">
        {employees.map((e) => (
          <li key={e.id} className="rounded-lg border border-white/10 px-3 py-2">
            {e.name} — {e.hours.length} روز کاری
          </li>
        ))}
      </ul>
      <form action={addEmployee} className="grid max-w-md gap-2">
        <input name="name" required placeholder="نام" className="rounded bg-white/5 px-3 py-2" />
        <input name="bio" placeholder="توضیح کوتاه" className="rounded bg-white/5 px-3 py-2" />
        <button className="w-fit rounded bg-[#e10600] px-4 py-2">افزودن</button>
      </form>
      <p className="text-xs text-white/45">ساعت کاری پرسنل از ساعت سالن کپی می‌شود. شعبه پیش‌فرض برای توسعه چندشعبه‌ای نگه داشته شده است.</p>
    </section>
  )
}
