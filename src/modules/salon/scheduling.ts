const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export type MinuteRange = { startMin: number; endMin: number }

export function rangesOverlap(a0: number, a1: number, b0: number, b1: number) {
  return a0 < b1 && b0 < a1
}

export function slotsForDay(input: {
  openMin: number
  closeMin: number
  duration: number
  step: number
  busy: MinuteRange[]
}) {
  const slots: number[] = []
  const step = Math.max(5, input.step)
  if (input.duration <= 0 || input.closeMin <= input.openMin) return slots
  for (let t = input.openMin; t + input.duration <= input.closeMin; t += step) {
    const end = t + input.duration
    const blocked = input.busy.some((b) => rangesOverlap(t, end, b.startMin, b.endMin))
    if (!blocked) slots.push(t)
  }
  return slots
}

export function tehranLocalToUtc(ymd: string, minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const iso = `${ymd}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+03:30`
  return new Date(iso)
}

export function tehranYmd(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function tehranMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0)
  return hour * 60 + minute
}

export function tehranWeekday(ymd: string) {
  const noon = tehranLocalToUtc(ymd, 12 * 60)
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    weekday: 'short',
  }).format(noon)
  return WEEKDAY[short] ?? 0
}

export function parseHm(value: string) {
  const [h, m] = value.split(':').map((n) => Number(n))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

export function formatHm(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function calendarColumnCount(view: 'day' | 'week' | 'month', viewport: number) {
  if (view === 'day') return 1
  if (viewport < 640) return 2
  if (viewport < 1024) return 4
  return 7
}

export function dayDistance(ymd: string, todayYmd: string) {
  const start = Date.parse(`${ymd}T00:00:00Z`)
  const today = Date.parse(`${todayYmd}T00:00:00Z`)
  return Math.round((start - today) / 86400000)
}

export function withinHorizon(ymd: string, todayYmd: string, maxHorizonDays: number) {
  const distance = dayDistance(ymd, todayYmd)
  return distance >= 0 && distance <= Math.max(0, maxHorizonDays)
}

export function advanceAllowed(start: Date, now: Date, minAdvanceMinutes: number) {
  return start.getTime() >= now.getTime() + Math.max(0, minAdvanceMinutes) * 60000
}

export function cancellationAllowed(start: Date, now: Date, cancellationHours: number) {
  return start.getTime() - now.getTime() >= Math.max(0, cancellationHours) * 60 * 60 * 1000
}

export function resolveOpenWindow(input: {
  weekly: { closed: boolean; startTime: string; endTime: string } | null
  exception: { closed: boolean; startTime: string; endTime: string } | null
}) {
  if (input.exception) {
    if (input.exception.closed) return null
    return {
      openMin: parseHm(input.exception.startTime),
      closeMin: parseHm(input.exception.endTime),
    }
  }
  if (!input.weekly || input.weekly.closed) return null
  return {
    openMin: parseHm(input.weekly.startTime),
    closeMin: parseHm(input.weekly.endTime),
  }
}

export function employeeWindow(
  businessWindow: { openMin: number; closeMin: number },
  employeeHours: { startTime: string; endTime: string } | null,
  exceptionOpen: boolean,
) {
  if (!employeeHours) {
    return exceptionOpen ? businessWindow : null
  }
  return {
    openMin: Math.max(businessWindow.openMin, parseHm(employeeHours.startTime)),
    closeMin: Math.min(businessWindow.closeMin, parseHm(employeeHours.endTime)),
  }
}

export function expandBusy(
  ranges: MinuteRange[],
  bufferMinutes: number,
): MinuteRange[] {
  return ranges.map((r) => ({
    startMin: r.startMin,
    endMin: r.endMin + Math.max(0, bufferMinutes),
  }))
}
