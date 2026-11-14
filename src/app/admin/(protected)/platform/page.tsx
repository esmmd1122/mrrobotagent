import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { revalidatePath } from 'next/cache'

async function setStatus(formData: FormData) {
  'use server'
  await requireAdmin(PERMISSIONS.PLATFORM_MANAGE)
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) return
  await prisma.salonBusiness.update({ where: { id }, data: { status } })
  await prisma.salonAudit.create({
    data: { businessId: id, actor: 'platform-admin', action: `business.${status}` },
  })
  revalidatePath('/admin/platform')
}

export default async function PlatformPage() {
  await requireAdmin(PERMISSIONS.PLATFORM_MANAGE)
  const [businesses, guests, bookings, tokens] = await Promise.all([
    prisma.salonBusiness.findMany({
      include: { subscription: { include: { plan: true } }, _count: { select: { bookings: true, guests: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.salonGuest.count(),
    prisma.salonBooking.count(),
    prisma.salonAiUsage.aggregate({ _sum: { tokens: true } }),
  ])
  const active = businesses.filter((b) => b.status === 'ACTIVE').length
  return (
    <section className="space-y-4 text-white">
      <h1 className="text-2xl font-semibold">مدیریت پلتفرم سالن‌ها</h1>
      <p className="text-sm text-white/60">Created by MR.ROBOT AI — پرداخت اشتراک در این نسخه وصل نشده است.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="کسب‌وکارها" value={businesses.length} />
        <Stat label="فعال" value={active} />
        <Stat label="معلق" value={businesses.length - active} />
        <Stat label="مشتریان / نوبت‌ها" value={`${guests} / ${bookings}`} />
      </div>
      <p className="text-sm">توکن ثبت‌شده Gemini: {tokens._sum.tokens || 0}</p>
      <ul className="space-y-2 text-sm">
        {businesses.map((b) => (
          <li key={b.id} className="rounded-lg border border-white/10 p-3">
            <p>{b.name} — /salon/{b.slug} — {b.status} — طرح {b.subscription?.plan.nameFa}</p>
            <p className="text-white/50">نوبت {b._count.bookings} — مشتری {b._count.guests} — مصرف نوبت دوره {b.subscription?.bookingCount}</p>
            <form action={setStatus} className="mt-2 flex gap-2">
              <input type="hidden" name="id" value={b.id} />
              <select name="status" defaultValue={b.status} className="rounded bg-zinc-900 px-2 py-1">
                <option value="ACTIVE">فعال</option>
                <option value="SUSPENDED">معلق</option>
              </select>
              <button className="rounded bg-white/10 px-3">اعمال</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-xl border border-white/10 p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-xl">{value}</p>
    </article>
  )
}
