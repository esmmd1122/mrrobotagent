'use client'

import { useEffect, useMemo, useState } from 'react'
import { setBookingStatus } from '@/app/studio/actions'
import { calendarColumnCount, tehranWeekday, tehranYmd } from '@/modules/salon/scheduling'

type Booking = {
  id: string
  reference: string
  status: string
  start: string
  end: string
  service: string
  employee: string
  employeeId: string
  phone: string
}

const statusLabel: Record<string, string> = {
  PENDING: 'در انتظار',
  CONFIRMED: 'تایید',
  COMPLETED: 'انجام شد',
  CANCELLED: 'لغو',
  NO_SHOW: 'عدم حضور',
}

const statusClass: Record<string, string> = {
  PENDING: 'border-amber-400/60',
  CONFIRMED: 'border-emerald-400/60',
  COMPLETED: 'border-sky-400/60',
  CANCELLED: 'border-zinc-500',
  NO_SHOW: 'border-orange-400/70',
}

function ymd(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function StudioCalendar({
  bookings,
  employees,
  canEditAll,
  staffEmployeeId,
}: {
  bookings: Booking[]
  employees: { id: string; name: string }[]
  canEditAll: boolean
  staffEmployeeId: string | null
}) {
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')
  const [cursor, setCursor] = useState(() => new Date())
  const [viewport, setViewport] = useState(390)
  const [employeeId, setEmployeeId] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const visible = useMemo(
    () => bookings.filter((item) => !employeeId || item.employeeId === employeeId),
    [bookings, employeeId],
  )

  useEffect(() => {
    const read = () => setViewport(window.innerWidth)
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])

  const days = useMemo(() => {
    if (view === 'day') return [cursor]
    if (view === 'week') {
      const start = addDays(cursor, -tehranWeekday(tehranYmd(cursor)))
      return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = addDays(first, -first.getDay())
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [cursor, view])

  const selected = visible.find((item) => item.id === openId) || null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['day', 'week', 'month'] as const).map((item) => (
          <button key={item} type="button" onClick={() => setView(item)} className={`rounded-full px-3 py-1 text-xs ${view === item ? 'bg-[#e10600]' : 'bg-white/10'}`}>
            {item === 'day' ? 'روزانه' : item === 'week' ? 'هفتگی' : 'ماهانه'}
          </button>
        ))}
        <button type="button" className="rounded bg-white/10 px-3 py-1 text-xs" onClick={() => setCursor(addDays(cursor, view === 'month' ? -30 : view === 'week' ? -7 : -1))}>قبلی</button>
        <button type="button" className="rounded bg-white/10 px-3 py-1 text-xs" onClick={() => setCursor(new Date())}>امروز</button>
        <button type="button" className="rounded bg-white/10 px-3 py-1 text-xs" onClick={() => setCursor(addDays(cursor, view === 'month' ? 30 : view === 'week' ? 7 : 1))}>بعدی</button>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="rounded bg-zinc-900 px-2 py-1 text-xs">
          <option value="">همه پرسنل</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
        </select>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${calendarColumnCount(view, viewport)}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
          const key = ymd(day)
          const items = visible.filter((item) => ymd(new Date(item.start)) === key)
          return (
            <section key={key} className="min-h-24 rounded-xl border border-white/10 p-2">
              <p className="text-xs text-white/50">{new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', month: 'short', day: 'numeric', weekday: 'short' }).format(day)}</p>
              <div className="mt-2 space-y-1">
                {items.map((item) => (
                  <button key={item.id} type="button" onClick={() => setOpenId(item.id)} className={`block w-full rounded border-r-4 bg-white/5 px-2 py-1 text-right text-xs ${statusClass[item.status] || ''}`}>
                    {new Date(item.start).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' })} {item.service}
                    <span className="mt-1 block text-white/45">{statusLabel[item.status] || item.status} — {item.employee}</span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {selected && (
        <aside className="rounded-xl border border-white/10 p-4 text-sm">
          <p>{selected.reference} — {selected.service}</p>
          <p className="text-white/60">{selected.employee} — {selected.phone}</p>
          <p className="text-white/60">{new Date(selected.start).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</p>
          {(canEditAll || staffEmployeeId === selected.employeeId) ? (
            <form action={setBookingStatus} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={selected.id} />
              <select name="status" defaultValue={selected.status} className="rounded bg-zinc-900 px-2 py-1">
                {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button className="rounded bg-[#e10600] px-3">ذخیره وضعیت</button>
            </form>
          ) : (
            <p className="mt-2 text-xs text-white/45">تغییر این نوبت برای شما مجاز نیست.</p>
          )}
        </aside>
      )}
    </div>
  )
}
