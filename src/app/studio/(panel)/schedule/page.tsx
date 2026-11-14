import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { canManage, getStudioSession } from '@/modules/salon/auth'
import {
  addBusinessBreak,
  addDayOff,
  addEmployeeBlock,
  addEmployeeBreak,
  addExceptionHour,
  addHoliday,
  removeBusinessBreak,
  removeDayOff,
  removeEmployeeBlock,
  removeEmployeeBreak,
  removeExceptionHour,
  removeHoliday,
} from '@/app/studio/actions'

const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']

export default async function SchedulePage() {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  const manager = canManage(session.role)
  if (!manager && session.role !== 'STAFF') redirect('/studio')
  const [holidays, breaks, exceptions, employees] = await Promise.all([
    prisma.salonHoliday.findMany({ where: { businessId: session.businessId }, orderBy: { date: 'asc' } }),
    prisma.salonBusinessBreak.findMany({ where: { businessId: session.businessId } }),
    prisma.salonExceptionHour.findMany({ where: { businessId: session.businessId }, orderBy: { date: 'asc' } }),
    prisma.salonEmployee.findMany({
      where: {
        businessId: session.businessId,
        isActive: true,
        ...(manager ? {} : { id: session.employeeId || 'none' }),
      },
      include: { breaks: true, daysOff: true, blocks: true },
    }),
  ])

  return (
    <section className="space-y-8 text-sm">
      <h1 className="text-xl font-semibold">برنامه زمانی</h1>
      <p className="text-white/55">این موارد در محاسبه زمان آزاد رزرو اعمال می‌شوند. تعطیلی کل روز را می‌بندد.</p>

      {manager && <Block title="تعطیلی سالن">
        <ul className="space-y-1">
          {holidays.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2">
              <span>{item.date} — {item.label || 'تعطیل'}</span>
              <form action={removeHoliday}><input type="hidden" name="id" value={item.id} /><button className="text-red-300">حذف</button></form>
            </li>
          ))}
        </ul>
        <form action={addHoliday} className="mt-3 grid gap-2 sm:grid-cols-3">
          <input name="date" type="date" required className="rounded bg-white/5 px-2 py-2" />
          <input name="label" placeholder="مناسبت" className="rounded bg-white/5 px-2 py-2" />
          <button className="rounded bg-[#e10600] px-3">ثبت تعطیلی</button>
        </form>
      </Block>}

      {manager && <Block title="استراحت هفتگی سالن">
        <ul className="space-y-1">
          {breaks.map((item) => (
            <li key={item.id} className="flex items-center justify-between">
              <span>{days[item.dayOfWeek]} {item.startTime}–{item.endTime}</span>
              <form action={removeBusinessBreak}><input type="hidden" name="id" value={item.id} /><button className="text-red-300">حذف</button></form>
            </li>
          ))}
        </ul>
        <TimeForm action={addBusinessBreak} />
      </Block>}

      {manager && <Block title="ساعت کاری استثنایی">
        <ul className="space-y-1">
          {exceptions.map((item) => (
            <li key={item.id} className="flex items-center justify-between">
              <span>{item.date}: {item.closed ? 'بسته' : `${item.startTime}–${item.endTime}`}</span>
              <form action={removeExceptionHour}><input type="hidden" name="id" value={item.id} /><button className="text-red-300">حذف</button></form>
            </li>
          ))}
        </ul>
        <form action={addExceptionHour} className="mt-3 grid gap-2 sm:grid-cols-4">
          <input name="date" type="date" required className="rounded bg-white/5 px-2 py-2" />
          <input name="startTime" type="time" defaultValue="12:00" className="rounded bg-white/5 px-2 py-2" />
          <input name="endTime" type="time" defaultValue="16:00" className="rounded bg-white/5 px-2 py-2" />
          <label className="flex items-center gap-2"><input name="closed" type="checkbox" /> بسته</label>
          <button className="rounded bg-[#e10600] px-3 sm:col-span-4 sm:w-fit">ثبت استثنا</button>
        </form>
      </Block>}

      {!manager && employees.length === 0 && (
        <p>این حساب پرسنل به یک پروفایل کارمند وصل نشده است.</p>
      )}

      {employees.map((employee) => (
        <Block key={employee.id} title={employee.name}>
          <p className="text-white/50">استراحت هفتگی</p>
          {employee.breaks.map((item) => (
            <Row key={item.id} action={removeEmployeeBreak} id={item.id} text={`${days[item.dayOfWeek]} ${item.startTime}–${item.endTime}`} />
          ))}
          <TimeForm action={addEmployeeBreak} employeeId={employee.id} />
          <p className="mt-3 text-white/50">مرخصی روزانه</p>
          {employee.daysOff.map((item) => (
            <Row key={item.id} action={removeDayOff} id={item.id} text={item.date} />
          ))}
          <form action={addDayOff} className="mt-2 flex flex-wrap gap-2">
            <input type="hidden" name="employeeId" value={employee.id} />
            <input name="date" type="date" required className="rounded bg-white/5 px-2 py-2" />
            <button className="rounded bg-white/10 px-3">ثبت مرخصی</button>
          </form>
          <p className="mt-3 text-white/50">بازه عدم حضور در یک تاریخ</p>
          {employee.blocks.map((item) => (
            <Row key={item.id} action={removeEmployeeBlock} id={item.id} text={`${item.date} ${item.startTime}–${item.endTime}`} />
          ))}
          <form action={addEmployeeBlock} className="mt-2 grid gap-2 sm:grid-cols-4">
            <input type="hidden" name="employeeId" value={employee.id} />
            <input name="date" type="date" required className="rounded bg-white/5 px-2 py-2" />
            <input name="startTime" type="time" defaultValue="15:00" className="rounded bg-white/5 px-2 py-2" />
            <input name="endTime" type="time" defaultValue="17:00" className="rounded bg-white/5 px-2 py-2" />
            <button className="rounded bg-white/10 px-3">ثبت بازه</button>
          </form>
        </Block>
      ))}
    </section>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-white/10 p-4"><h2 className="mb-3 font-medium">{title}</h2>{children}</section>
}

function Row({ action, id, text }: { action: (formData: FormData) => Promise<void>; id: string; text: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span>{text}</span>
      <form action={action}><input type="hidden" name="id" value={id} /><button className="text-red-300">حذف</button></form>
    </div>
  )
}

function TimeForm({
  action,
  employeeId,
}: {
  action: (formData: FormData) => Promise<void>
  employeeId?: string
}) {
  return (
    <form action={action} className="mt-2 grid gap-2 sm:grid-cols-4">
      {employeeId && <input type="hidden" name="employeeId" value={employeeId} />}
      <select name="dayOfWeek" className="rounded bg-zinc-900 px-2 py-2">
        {days.map((label, index) => <option key={label} value={index}>{label}</option>)}
      </select>
      <input name="startTime" type="time" defaultValue="13:00" className="rounded bg-white/5 px-2 py-2" />
      <input name="endTime" type="time" defaultValue="14:00" className="rounded bg-white/5 px-2 py-2" />
      <button className="rounded bg-[#e10600] px-3">افزودن</button>
    </form>
  )
}
