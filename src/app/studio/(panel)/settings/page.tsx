import { prisma } from '@/lib/db'
import { getStudioSession } from '@/modules/salon/auth'
import { publishBusiness, saveBusinessProfile } from '@/app/studio/actions'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  const business = await prisma.salonBusiness.findUnique({ where: { id: session.businessId } })
  if (!business) redirect('/studio/login')
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">تنظیمات و انتشار</h1>
      <form action={saveBusinessProfile} className="grid max-w-xl gap-2">
        <input name="name" defaultValue={business.name} className="rounded bg-white/5 px-3 py-2" />
        <textarea name="description" defaultValue={business.description} className="rounded bg-white/5 px-3 py-2" placeholder="معرفی سالن" />
        <input name="phone" defaultValue={business.phone || ''} className="rounded bg-white/5 px-3 py-2" placeholder="تلفن" />
        <input name="address" defaultValue={business.address || ''} className="rounded bg-white/5 px-3 py-2" placeholder="آدرس" />
        <input name="logoUrl" defaultValue={business.logoUrl || ''} className="rounded bg-white/5 px-3 py-2" placeholder="آدرس لوگو" />
        <input name="coverUrl" defaultValue={business.coverUrl || ''} className="rounded bg-white/5 px-3 py-2" placeholder="آدرس کاور" />
        <label className="text-sm">رنگ تاکید صفحه رزرو
          <input name="accentColor" type="color" defaultValue={business.accentColor} className="mr-2" />
        </label>
        <label className="text-sm">مهلت لغو (ساعت)
          <input name="cancellationHours" type="number" min={0} defaultValue={business.cancellationHours} className="mt-1 w-full rounded bg-white/5 px-3 py-2" />
        </label>
        <label className="text-sm">فاصله بین نوبت‌ها (دقیقه)
          <input name="bufferMinutes" type="number" min={0} defaultValue={business.bufferMinutes} className="mt-1 w-full rounded bg-white/5 px-3 py-2" />
        </label>
        <label className="text-sm">حداقل فاصله تا شروع نوبت (دقیقه)
          <input name="minAdvanceMinutes" type="number" min={0} defaultValue={business.minAdvanceMinutes} className="mt-1 w-full rounded bg-white/5 px-3 py-2" />
        </label>
        <label className="text-sm">افق رزرو (روز)
          <input name="maxHorizonDays" type="number" min={1} defaultValue={business.maxHorizonDays} className="mt-1 w-full rounded bg-white/5 px-3 py-2" />
        </label>
        <button className="w-fit rounded bg-white/10 px-4 py-2">ذخیره</button>
      </form>
      <form action="/api/studio/upload" method="post" encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="field" value="logoUrl" />
        <input name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
        <button className="rounded bg-white/10 px-3 py-2">آپلود لوگو</button>
      </form>
      <form action="/api/studio/upload" method="post" encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="field" value="coverUrl" />
        <input name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
        <button className="rounded bg-white/10 px-3 py-2">آپلود کاور</button>
      </form>
      <form action={publishBusiness}>
        <button className="rounded bg-[#e10600] px-4 py-2">
          {business.published ? 'به‌روزرسانی انتشار' : 'انتشار صفحه رزرو'}
        </button>
      </form>
      <p className="text-sm text-white/60">لینک اشتراک: /salon/{business.slug}</p>
      <p className="text-xs text-white/40">پرداخت آنلاین در این نسخه فعال نیست؛ مشتری در سالن پرداخت می‌کند.</p>
    </section>
  )
}
