import { prisma } from '@/lib/db'
import { isUniqueConflict, lockBookingSlot } from './booking-lock'
import {
  advanceAllowed,
  cancellationAllowed,
  employeeWindow,
  expandBusy,
  formatHm,
  parseHm,
  resolveOpenWindow,
  slotsForDay,
  tehranLocalToUtc,
  tehranMinutes,
  tehranWeekday,
  tehranYmd,
  withinHorizon,
} from './scheduling'

const OPEN = ['PENDING', 'CONFIRMED']

export async function listSlots(input: {
  businessId: string
  offeringId: string
  employeeId?: string | null
  ymd: string
}) {
  const business = await prisma.salonBusiness.findUnique({
    where: { id: input.businessId },
  })
  if (!business || business.status !== 'ACTIVE') return []

  const offering = await prisma.salonOffering.findFirst({
    where: { id: input.offeringId, businessId: business.id, isActive: true },
  })
  if (!offering) return []

  const today = tehranYmd(new Date())
  if (!withinHorizon(input.ymd, today, business.maxHorizonDays)) return []

  const holiday = await prisma.salonHoliday.findUnique({
    where: { businessId_date: { businessId: business.id, date: input.ymd } },
  })
  if (holiday) return []

  const weekday = tehranWeekday(input.ymd)
  const [day, exception, businessBreaks] = await Promise.all([
    prisma.salonBusinessHour.findUnique({
      where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: weekday } },
    }),
    prisma.salonExceptionHour.findUnique({
      where: { businessId_date: { businessId: business.id, date: input.ymd } },
    }),
    prisma.salonBusinessBreak.findMany({
      where: { businessId: business.id, dayOfWeek: weekday },
    }),
  ])
  const businessWindow = resolveOpenWindow({ weekly: day, exception })
  if (!businessWindow) return []

  const links = await prisma.salonEmployeeService.findMany({
    where: {
      offeringId: offering.id,
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      employee: { isActive: true, businessId: business.id },
    },
    include: { employee: true },
  })

  const dayStart = tehranLocalToUtc(input.ymd, 0)
  const dayEnd = tehranLocalToUtc(input.ymd, 24 * 60)
  const now = new Date()
  const result: { employeeId: string; employeeName: string; start: string; label: string }[] = []

  for (const link of links) {
    const employee = link.employee
    const [hours, off, breaks, blocks] = await Promise.all([
      prisma.salonEmployeeHour.findUnique({
        where: { employeeId_dayOfWeek: { employeeId: employee.id, dayOfWeek: weekday } },
      }),
      prisma.salonDayOff.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: input.ymd } },
      }),
      prisma.salonEmployeeBreak.findMany({
        where: { employeeId: employee.id, dayOfWeek: weekday },
      }),
      prisma.salonEmployeeBlock.findMany({
        where: { employeeId: employee.id, date: input.ymd },
      }),
    ])
    if (off) continue
    const window = employeeWindow(businessWindow, hours, Boolean(exception && !exception.closed))
    if (!window || window.closeMin <= window.openMin) continue
    const openMin = window.openMin
    const closeMin = window.closeMin
    const bookings = await prisma.salonBooking.findMany({
      where: {
        employeeId: employee.id,
        status: { in: OPEN },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
    })
    const busy = [
      ...businessBreaks.map((b) => ({ startMin: parseHm(b.startTime), endMin: parseHm(b.endTime) })),
      ...breaks.map((b) => ({ startMin: parseHm(b.startTime), endMin: parseHm(b.endTime) })),
      ...blocks.map((b) => ({ startMin: parseHm(b.startTime), endMin: parseHm(b.endTime) })),
      ...expandBusy(
        bookings
          .filter((b) => tehranYmd(b.startTime) === input.ymd)
          .map((b) => ({
            startMin: tehranMinutes(b.startTime),
            endMin: tehranMinutes(b.endTime),
          })),
        business.bufferMinutes,
      ),
    ]
    const slots = slotsForDay({
      openMin,
      closeMin,
      duration: offering.durationMinutes,
      step: business.slotStepMinutes,
      busy,
    })
    for (const min of slots) {
      const start = tehranLocalToUtc(input.ymd, min)
      if (!advanceAllowed(start, now, business.minAdvanceMinutes)) continue
      result.push({
        employeeId: employee.id,
        employeeName: employee.name,
        start: start.toISOString(),
        label: formatHm(min),
      })
    }
  }
  return result
}

export async function createBooking(input: {
  businessId: string
  offeringId: string
  employeeId?: string | null
  startIso: string
  phone: string
  name?: string
}) {
  const start = new Date(input.startIso)
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw new Error('زمان نامعتبر است')
  }
  const ymd = tehranYmd(start)
  const preview = await prisma.salonOffering.findFirst({
    where: { id: input.offeringId, businessId: input.businessId, isActive: true },
  })
  if (!preview) throw new Error('خدمت معتبر نیست')
  const slots = await listSlots({
    businessId: input.businessId,
    offeringId: preview.id,
    employeeId: input.employeeId,
    ymd,
  })
  const match = slots.find(
    (s) =>
      s.start === start.toISOString() &&
      (!input.employeeId || s.employeeId === input.employeeId),
  )
  if (!match) throw new Error('این زمان دیگر آزاد نیست')

  try {
  return await prisma.$transaction(async (tx) => {
    await lockBookingSlot(tx, match.employeeId, start.toISOString())
    const business = await tx.salonBusiness.findUnique({
      where: { id: input.businessId },
      include: { subscription: { include: { plan: true } } },
    })
    if (!business || business.status !== 'ACTIVE' || !business.published) {
      throw new Error('سالن فعال نیست')
    }
    const sub = business.subscription
    if (sub && sub.periodEnd.getTime() < Date.now()) {
      await tx.salonSubscription.update({
        where: { id: sub.id },
        data: {
          bookingCount: 0,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
      sub.bookingCount = 0
    }
    if (sub && sub.bookingCount >= sub.plan.monthlyBookingLimit) {
      throw new Error('سقف نوبت ماهانه این سالن پر شده است')
    }
    const offering = await tx.salonOffering.findFirst({
      where: { id: input.offeringId, businessId: business.id, isActive: true },
    })
    if (!offering) throw new Error('خدمت معتبر نیست')

    const clash = await tx.salonBooking.findFirst({
      where: {
        employeeId: match.employeeId,
        status: { in: OPEN },
        startTime: { lt: new Date(start.getTime() + offering.durationMinutes * 60000) },
        endTime: { gt: start },
      },
    })
    if (clash) throw new Error('این زمان همین الان رزرو شد')

    const employee = await tx.salonEmployee.findFirst({
      where: { id: match.employeeId, businessId: business.id },
    })
    if (!employee) throw new Error('پرسنل یافت نشد')

    const guest = await tx.salonGuest.upsert({
      where: { businessId_phone: { businessId: business.id, phone: input.phone } },
      update: input.name ? { name: input.name } : {},
      create: { businessId: business.id, phone: input.phone, name: input.name || null },
    })

    const reference = `MR${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const booking = await tx.salonBooking.create({
      data: {
        businessId: business.id,
        branchId: employee.branchId,
        employeeId: employee.id,
        offeringId: offering.id,
        guestId: guest.id,
        startTime: start,
        endTime: new Date(start.getTime() + offering.durationMinutes * 60000),
        status: 'CONFIRMED',
        reference,
        slotKey: `${employee.id}:${start.toISOString()}`,
      },
    })
    if (sub) {
      await tx.salonSubscription.update({
        where: { id: sub.id },
        data: { bookingCount: { increment: 1 } },
      })
    }
    await tx.salonNotification.create({
      data: {
        businessId: business.id,
        kind: 'BOOKING_CREATED',
        title: 'نوبت جدید',
        body: `${offering.name} — ${reference}`,
      },
    })
    await tx.salonAudit.create({
      data: {
        businessId: business.id,
        actor: input.phone,
        action: 'booking.create',
        metadata: booking.id,
      },
    })
    return booking
  })
  } catch (error) {
    if (isUniqueConflict(error)) throw new Error('این زمان همین الان رزرو شد')
    throw error
  }
}

export async function rescheduleBooking(input: {
  businessId: string
  phone: string
  bookingId: string
  startIso: string
}) {
  const current = await prisma.salonBooking.findFirst({
    where: {
      id: input.bookingId,
      businessId: input.businessId,
      guest: { phone: input.phone },
      status: { in: OPEN },
    },
  })
  if (!current) throw new Error('نوبت یافت نشد')
  const start = new Date(input.startIso)
  const ymd = tehranYmd(start)
  const slots = await listSlots({
    businessId: input.businessId,
    offeringId: current.offeringId,
    employeeId: current.employeeId,
    ymd,
  })
  if (!slots.some((s) => s.start === start.toISOString() && s.employeeId === current.employeeId)) {
    throw new Error('زمان جایگزین آزاد نیست')
  }
  const offering = await prisma.salonOffering.findUniqueOrThrow({
    where: { id: current.offeringId },
  })
  try {
  return await prisma.$transaction(async (tx) => {
    await lockBookingSlot(tx, current.employeeId, start.toISOString())
    const clash = await tx.salonBooking.findFirst({
      where: {
        id: { not: current.id },
        employeeId: current.employeeId,
        status: { in: OPEN },
        startTime: { lt: new Date(start.getTime() + offering.durationMinutes * 60000) },
        endTime: { gt: start },
      },
    })
    if (clash) throw new Error('این زمان همین الان رزرو شد')
    const updated = await tx.salonBooking.update({
      where: { id: current.id },
      data: {
        startTime: start,
        endTime: new Date(start.getTime() + offering.durationMinutes * 60000),
        status: 'CONFIRMED',
        slotKey: `${current.employeeId}:${start.toISOString()}`,
      },
    })
    await tx.salonNotification.create({
      data: {
        businessId: input.businessId,
        kind: 'BOOKING_CHANGED',
        title: 'تغییر نوبت',
        body: updated.reference,
      },
    })
    return updated
  })
  } catch (error) {
    if (isUniqueConflict(error)) throw new Error('این زمان همین الان رزرو شد')
    throw error
  }
}

export async function cancelBooking(input: {
  businessId: string
  phone: string
  bookingId: string
}) {
  const business = await prisma.salonBusiness.findUnique({ where: { id: input.businessId } })
  if (!business) throw new Error('سالن یافت نشد')
  const booking = await prisma.salonBooking.findFirst({
    where: {
      id: input.bookingId,
      businessId: business.id,
      guest: { phone: input.phone },
      status: { in: OPEN },
    },
  })
  if (!booking) throw new Error('نوبت فعال یافت نشد')
  if (!cancellationAllowed(booking.startTime, new Date(), business.cancellationHours)) {
    throw new Error(`لغو فقط تا ${business.cancellationHours} ساعت قبل از نوبت ممکن است`)
  }
  const updated = await prisma.salonBooking.update({
    where: { id: booking.id },
    data: { status: 'CANCELLED', slotKey: null },
  })
  await prisma.salonNotification.create({
    data: {
      businessId: business.id,
      kind: 'BOOKING_CANCELLED',
      title: 'لغو نوبت',
      body: updated.reference,
    },
  })
  return updated
}
