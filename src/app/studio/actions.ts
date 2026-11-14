'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { canManage, getStudioSession } from '@/modules/salon/auth'

async function ownerBusiness() {
  const session = await getStudioSession()
  if (!session || !canManage(session.role)) throw new Error('دسترسی ندارید')
  const business = await prisma.salonBusiness.findUnique({
    where: { id: session.businessId },
    include: { subscription: { include: { plan: true } }, branches: true },
  })
  if (!business) throw new Error('کسب‌وکار یافت نشد')
  return { session, business }
}

export async function saveBusinessProfile(formData: FormData) {
  const { business } = await ownerBusiness()
  await prisma.salonBusiness.update({
    where: { id: business.id },
    data: {
      name: String(formData.get('name') || business.name),
      description: String(formData.get('description') || ''),
      phone: String(formData.get('phone') || ''),
      address: String(formData.get('address') || ''),
      accentColor: String(formData.get('accentColor') || '#111111'),
      logoUrl: String(formData.get('logoUrl') || '') || null,
      coverUrl: String(formData.get('coverUrl') || '') || null,
      cancellationHours: Number(formData.get('cancellationHours') || 2),
      bufferMinutes: Number(formData.get('bufferMinutes') || 0),
      minAdvanceMinutes: Number(formData.get('minAdvanceMinutes') || 0),
      maxHorizonDays: Number(formData.get('maxHorizonDays') || 1),
    },
  })
  revalidatePath('/studio')
}

export async function publishBusiness() {
  const { business } = await ownerBusiness()
  const [services, employees] = await Promise.all([
    prisma.salonOffering.count({ where: { businessId: business.id, isActive: true } }),
    prisma.salonEmployee.count({ where: { businessId: business.id, isActive: true } }),
  ])
  if (!services || !employees) {
    throw new Error('قبل از انتشار حداقل یک خدمت و یک پرسنل لازم است')
  }
  await prisma.salonBusiness.update({
    where: { id: business.id },
    data: { published: true },
  })
  revalidatePath('/studio')
}

export async function addOffering(formData: FormData) {
  const { business } = await ownerBusiness()
  const offering = await prisma.salonOffering.create({
    data: {
      businessId: business.id,
      name: String(formData.get('name') || ''),
      description: String(formData.get('description') || ''),
      priceToman: Number(formData.get('price') || 0),
      durationMinutes: Number(formData.get('duration') || 30),
    },
  })
  const employeeIds = formData.getAll('employeeId').map(String)
  if (employeeIds.length) {
    await prisma.salonEmployeeService.createMany({
      data: employeeIds.map((employeeId) => ({ employeeId, offeringId: offering.id })),
    })
  }
  revalidatePath('/studio/services')
}

export async function deactivateOffering(formData: FormData) {
  const { business } = await ownerBusiness()
  const id = String(formData.get('id') || '')
  const bookings = await prisma.salonBooking.count({
    where: { offeringId: id, businessId: business.id, status: { in: ['PENDING', 'CONFIRMED'] } },
  })
  if (bookings) {
    await prisma.salonOffering.updateMany({
      where: { id, businessId: business.id },
      data: { isActive: false },
    })
  } else {
    await prisma.salonOffering.deleteMany({ where: { id, businessId: business.id } })
  }
  revalidatePath('/studio/services')
}

export async function addEmployee(formData: FormData) {
  const { business } = await ownerBusiness()
  const limit = business.subscription?.plan.employeeLimit ?? 1
  const count = await prisma.salonEmployee.count({
    where: { businessId: business.id, isActive: true },
  })
  if (count >= limit) throw new Error('سقف پرسنل طرح فعلی پر شده است')
  const branch = business.branches.find((b) => b.isDefault) || business.branches[0]
  if (!branch) throw new Error('شعبه پیش‌فرض وجود ندارد')
  const employee = await prisma.salonEmployee.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      name: String(formData.get('name') || ''),
      bio: String(formData.get('bio') || ''),
    },
  })
  const hours = await prisma.salonBusinessHour.findMany({ where: { businessId: business.id } })
  await prisma.salonEmployeeHour.createMany({
    data: hours
      .filter((h) => !h.closed)
      .map((h) => ({
        employeeId: employee.id,
        dayOfWeek: h.dayOfWeek,
        startTime: h.startTime,
        endTime: h.endTime,
      })),
  })
  revalidatePath('/studio/team')
}

export async function setBookingStatus(formData: FormData) {
  const session = await getStudioSession()
  if (!session) throw new Error('وارد نشده‌اید')
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  if (!['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'PENDING'].includes(status)) {
    throw new Error('وضعیت نامعتبر است')
  }
  const booking = await prisma.salonBooking.findFirst({
    where: { id, businessId: session.businessId },
  })
  if (!booking) throw new Error('نوبت این سالن نیست')
  if (session.role === 'STAFF' && session.employeeId !== booking.employeeId) {
    throw new Error('این نوبت برای پرسنل دیگری است')
  }
  await prisma.salonBooking.updateMany({
    where: { id, businessId: session.businessId },
    data: {
      status,
      slotKey: ['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(status) ? null : undefined,
    },
  })
  revalidatePath('/studio/calendar')
}

async function ownedEmployee(businessId: string, employeeId: string) {
  const employee = await prisma.salonEmployee.findFirst({
    where: { id: employeeId, businessId },
  })
  if (!employee) throw new Error('پرسنل این سالن نیست')
  return employee
}

export async function addHoliday(formData: FormData) {
  const { business } = await ownerBusiness()
  const date = String(formData.get('date') || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('تاریخ نامعتبر است')
  await prisma.salonHoliday.upsert({
    where: { businessId_date: { businessId: business.id, date } },
    update: { label: String(formData.get('label') || '') },
    create: { businessId: business.id, date, label: String(formData.get('label') || '') },
  })
  revalidatePath('/studio/schedule')
}

export async function removeHoliday(formData: FormData) {
  const { business } = await ownerBusiness()
  await prisma.salonHoliday.deleteMany({
    where: { id: String(formData.get('id') || ''), businessId: business.id },
  })
  revalidatePath('/studio/schedule')
}

export async function addBusinessBreak(formData: FormData) {
  const { business } = await ownerBusiness()
  await prisma.salonBusinessBreak.create({
    data: {
      businessId: business.id,
      dayOfWeek: Number(formData.get('dayOfWeek') || 0),
      startTime: String(formData.get('startTime') || '13:00'),
      endTime: String(formData.get('endTime') || '14:00'),
    },
  })
  revalidatePath('/studio/schedule')
}

export async function removeBusinessBreak(formData: FormData) {
  const { business } = await ownerBusiness()
  await prisma.salonBusinessBreak.deleteMany({
    where: { id: String(formData.get('id') || ''), businessId: business.id },
  })
  revalidatePath('/studio/schedule')
}

export async function addExceptionHour(formData: FormData) {
  const { business } = await ownerBusiness()
  const date = String(formData.get('date') || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('تاریخ نامعتبر است')
  const closed = formData.get('closed') === 'on'
  await prisma.salonExceptionHour.upsert({
    where: { businessId_date: { businessId: business.id, date } },
    update: {
      closed,
      startTime: String(formData.get('startTime') || '10:00'),
      endTime: String(formData.get('endTime') || '20:00'),
    },
    create: {
      businessId: business.id,
      date,
      closed,
      startTime: String(formData.get('startTime') || '10:00'),
      endTime: String(formData.get('endTime') || '20:00'),
    },
  })
  revalidatePath('/studio/schedule')
}

export async function removeExceptionHour(formData: FormData) {
  const { business } = await ownerBusiness()
  await prisma.salonExceptionHour.deleteMany({
    where: { id: String(formData.get('id') || ''), businessId: business.id },
  })
  revalidatePath('/studio/schedule')
}

async function editableEmployee(employeeId: string) {
  const session = await getStudioSession()
  if (!session) throw new Error('وارد نشده‌اید')
  if (session.role === 'STAFF') {
    if (!session.employeeId || session.employeeId !== employeeId) {
      throw new Error('پرسنل فقط برنامه خودش را تغییر می‌دهد')
    }
  } else if (!canManage(session.role)) {
    throw new Error('دسترسی ندارید')
  }
  return ownedEmployee(session.businessId, employeeId)
}

export async function addEmployeeBreak(formData: FormData) {
  const employeeId = String(formData.get('employeeId') || '')
  await editableEmployee(employeeId)
  await prisma.salonEmployeeBreak.create({
    data: {
      employeeId,
      dayOfWeek: Number(formData.get('dayOfWeek') || 0),
      startTime: String(formData.get('startTime') || '13:00'),
      endTime: String(formData.get('endTime') || '14:00'),
    },
  })
  revalidatePath('/studio/schedule')
}

export async function removeEmployeeBreak(formData: FormData) {
  const row = await prisma.salonEmployeeBreak.findUnique({
    where: { id: String(formData.get('id') || '') },
  })
  if (!row) return
  const employee = await editableEmployee(row.employeeId)
  await prisma.salonEmployeeBreak.deleteMany({
    where: { id: row.id, employee: { businessId: employee.businessId } },
  })
  revalidatePath('/studio/schedule')
}

export async function addDayOff(formData: FormData) {
  const employeeId = String(formData.get('employeeId') || '')
  const date = String(formData.get('date') || '')
  await editableEmployee(employeeId)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('تاریخ نامعتبر است')
  await prisma.salonDayOff.upsert({
    where: { employeeId_date: { employeeId, date } },
    update: {},
    create: { employeeId, date },
  })
  revalidatePath('/studio/schedule')
}

export async function removeDayOff(formData: FormData) {
  const row = await prisma.salonDayOff.findUnique({
    where: { id: String(formData.get('id') || '') },
  })
  if (!row) return
  const employee = await editableEmployee(row.employeeId)
  await prisma.salonDayOff.deleteMany({
    where: { id: row.id, employee: { businessId: employee.businessId } },
  })
  revalidatePath('/studio/schedule')
}

export async function addEmployeeBlock(formData: FormData) {
  const employeeId = String(formData.get('employeeId') || '')
  const date = String(formData.get('date') || '')
  await editableEmployee(employeeId)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('تاریخ نامعتبر است')
  await prisma.salonEmployeeBlock.create({
    data: {
      employeeId,
      date,
      startTime: String(formData.get('startTime') || '15:00'),
      endTime: String(formData.get('endTime') || '17:00'),
    },
  })
  revalidatePath('/studio/schedule')
}

export async function removeEmployeeBlock(formData: FormData) {
  const row = await prisma.salonEmployeeBlock.findUnique({
    where: { id: String(formData.get('id') || '') },
  })
  if (!row) return
  const employee = await editableEmployee(row.employeeId)
  await prisma.salonEmployeeBlock.deleteMany({
    where: { id: row.id, employee: { businessId: employee.businessId } },
  })
  revalidatePath('/studio/schedule')
}
