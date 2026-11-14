import { prisma } from '@/lib/db'
import {
  cancelBooking,
  createBooking,
  listSlots,
  rescheduleBooking,
} from '@/modules/salon/engine'
import { toman } from '@/modules/salon/format'
import type { AllowedActions } from './types'

const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']

export type ToolContext = {
  businessId: string
  conversationId: string
  guestPhone: string | null
  guestVerified: boolean
  allowed: AllowedActions
}

function deny(action: keyof AllowedActions) {
  return JSON.stringify({ ok: false, error: `عمل ${action} برای این ایجنت غیرفعال است` })
}

export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  switch (name) {
    case 'getBusinessInfo':
      return getBusinessInfo(ctx.businessId)
    case 'getServices':
      if (!ctx.allowed.services) return deny('services')
      return getServices(ctx.businessId)
    case 'getEmployees':
      return getEmployees(ctx.businessId)
    case 'getAvailableSlots':
      if (!ctx.allowed.slots) return deny('slots')
      return getAvailableSlots(ctx, args)
    case 'getCustomerAppointments':
      if (!ctx.allowed.appointments) return deny('appointments')
      return getCustomerAppointments(ctx)
    case 'prepareBooking':
      if (!ctx.allowed.book) return deny('book')
      return prepareBooking(ctx, args)
    case 'confirmBooking':
      if (!ctx.allowed.book) return deny('book')
      return confirmBooking(ctx, args)
    case 'prepareReschedule':
      if (!ctx.allowed.reschedule) return deny('reschedule')
      return prepareReschedule(ctx, args)
    case 'confirmReschedule':
      if (!ctx.allowed.reschedule) return deny('reschedule')
      return confirmReschedule(ctx, args)
    case 'prepareCancel':
      if (!ctx.allowed.cancel) return deny('cancel')
      return prepareCancel(ctx, args)
    case 'confirmCancel':
      if (!ctx.allowed.cancel) return deny('cancel')
      return confirmCancel(ctx, args)
    case 'searchFaqs':
      if (!ctx.allowed.faq) return deny('faq')
      return searchFaqs(ctx.businessId, String(args.query || ''))
    default:
      return JSON.stringify({ ok: false, error: 'ابزار نامعتبر' })
  }
}

async function getBusinessInfo(businessId: string) {
  const business = await prisma.salonBusiness.findUnique({
    where: { id: businessId },
    include: { hours: { orderBy: { dayOfWeek: 'asc' } } },
  })
  if (!business) return JSON.stringify({ ok: false, error: 'سالن یافت نشد' })
  return JSON.stringify({
    ok: true,
    name: business.name,
    description: business.description,
    phone: business.phone,
    address: business.address,
    hours: business.hours.map((h) => ({
      day: days[h.dayOfWeek] || h.dayOfWeek,
      closed: h.closed,
      start: h.startTime,
      end: h.endTime,
    })),
  })
}

async function getServices(businessId: string) {
  const rows = await prisma.salonOffering.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: 'asc' },
  })
  return JSON.stringify({
    ok: true,
    services: rows.map((s) => ({
      id: s.id,
      name: s.name,
      priceToman: s.priceToman,
      priceLabel: toman(s.priceToman),
      durationMinutes: s.durationMinutes,
      description: s.description,
    })),
  })
}

async function getEmployees(businessId: string) {
  const rows = await prisma.salonEmployee.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: 'asc' },
  })
  return JSON.stringify({
    ok: true,
    employees: rows.map((e) => ({ id: e.id, name: e.name, bio: e.bio })),
  })
}

async function getAvailableSlots(ctx: ToolContext, args: Record<string, unknown>) {
  const offeringId = String(args.offeringId || '')
  const date = String(args.date || '')
  const employeeId = args.employeeId ? String(args.employeeId) : undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return JSON.stringify({ ok: false, error: 'تاریخ نامعتبر' })
  }
  const slots = await listSlots({ businessId: ctx.businessId, offeringId, employeeId, ymd: date })
  return JSON.stringify({
    ok: true,
    slots: slots.slice(0, 25).map((s) => ({
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      startIso: s.start,
      label: s.label,
    })),
  })
}

async function getCustomerAppointments(ctx: ToolContext) {
  if (!ctx.guestVerified || !ctx.guestPhone) {
    return JSON.stringify({ ok: false, error: 'ابتدا شماره موبایل را با OTP تایید کنید' })
  }
  const rows = await prisma.salonBooking.findMany({
    where: { businessId: ctx.businessId, guest: { phone: ctx.guestPhone } },
    include: { offering: true, employee: true },
    orderBy: { startTime: 'desc' },
    take: 10,
  })
  return JSON.stringify({
    ok: true,
    bookings: rows.map((b) => ({
      id: b.id,
      reference: b.reference,
      status: b.status,
      start: b.startTime.toISOString(),
      service: b.offering.name,
      employee: b.employee.name,
    })),
  })
}

async function prepareBooking(ctx: ToolContext, args: Record<string, unknown>) {
  if (!ctx.guestVerified || !ctx.guestPhone) {
    return JSON.stringify({ ok: false, error: 'برای رزرو، شماره موبایل باید تایید شود' })
  }
  const payload = {
    offeringId: String(args.offeringId || ''),
    employeeId: args.employeeId ? String(args.employeeId) : null,
    startIso: String(args.startIso || ''),
    name: args.name ? String(args.name) : undefined,
  }
  const offering = await prisma.salonOffering.findFirst({
    where: { id: payload.offeringId, businessId: ctx.businessId, isActive: true },
  })
  if (!offering) return JSON.stringify({ ok: false, error: 'خدمت یافت نشد' })
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  const pending = await prisma.salonAgentPendingAction.create({
    data: {
      businessId: ctx.businessId,
      conversationId: ctx.conversationId,
      action: 'book',
      payload: JSON.stringify(payload),
      expiresAt,
    },
  })
  return JSON.stringify({
    ok: true,
    pendingId: pending.id,
    summary: `پیش‌نویس: ${offering.name} در ${payload.startIso}`,
    message: 'از مشتری تأیید صریح بگیرید سپس confirmBooking را فراخوانی کنید',
  })
}

async function confirmBooking(ctx: ToolContext, args: Record<string, unknown>) {
  if (!ctx.guestVerified || !ctx.guestPhone) {
    return JSON.stringify({ ok: false, error: 'شماره تایید نشده' })
  }
  const pending = await loadPending(ctx, String(args.pendingId || ''), 'book')
  if (!pending.ok) return JSON.stringify(pending)
  const payload = pending.data as {
    offeringId: string
    employeeId: string | null
    startIso: string
    name?: string
  }
  try {
    const booking = await createBooking({
      businessId: ctx.businessId,
      offeringId: payload.offeringId,
      employeeId: payload.employeeId,
      startIso: payload.startIso,
      phone: ctx.guestPhone,
      name: payload.name,
    })
    await prisma.salonAgentPendingAction.update({
      where: { id: pending.id },
      data: { consumedAt: new Date() },
    })
    return JSON.stringify({
      ok: true,
      reference: booking.reference,
      bookingId: booking.id,
      message: 'نوبت با موفقیت ثبت شد',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'ثبت ناموفق'
    return JSON.stringify({ ok: false, error: msg })
  }
}

async function prepareReschedule(ctx: ToolContext, args: Record<string, unknown>) {
  if (!ctx.guestVerified || !ctx.guestPhone) {
    return JSON.stringify({ ok: false, error: 'شماره تایید نشده' })
  }
  const payload = {
    bookingId: String(args.bookingId || ''),
    newStartIso: String(args.newStartIso || ''),
  }
  const booking = await prisma.salonBooking.findFirst({
    where: { id: payload.bookingId, businessId: ctx.businessId, guest: { phone: ctx.guestPhone } },
  })
  if (!booking) return JSON.stringify({ ok: false, error: 'نوبت یافت نشد' })
  const pending = await prisma.salonAgentPendingAction.create({
    data: {
      businessId: ctx.businessId,
      conversationId: ctx.conversationId,
      action: 'reschedule',
      payload: JSON.stringify(payload),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  })
  return JSON.stringify({ ok: true, pendingId: pending.id, summary: `تغییر به ${payload.newStartIso}` })
}

async function confirmReschedule(ctx: ToolContext, args: Record<string, unknown>) {
  const pending = await loadPending(ctx, String(args.pendingId || ''), 'reschedule')
  if (!pending.ok) return JSON.stringify(pending)
  const payload = pending.data as { bookingId: string; newStartIso: string }
  try {
    await rescheduleBooking({
      businessId: ctx.businessId,
      bookingId: payload.bookingId,
      startIso: payload.newStartIso,
      phone: ctx.guestPhone!,
    })
    await prisma.salonAgentPendingAction.update({
      where: { id: pending.id },
      data: { consumedAt: new Date() },
    })
    return JSON.stringify({ ok: true, message: 'زمان نوبت تغییر کرد' })
  } catch (error) {
    return JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'خطا' })
  }
}

async function prepareCancel(ctx: ToolContext, args: Record<string, unknown>) {
  if (!ctx.guestVerified || !ctx.guestPhone) {
    return JSON.stringify({ ok: false, error: 'شماره تایید نشده' })
  }
  const bookingId = String(args.bookingId || '')
  const booking = await prisma.salonBooking.findFirst({
    where: { id: bookingId, businessId: ctx.businessId, guest: { phone: ctx.guestPhone } },
    include: { offering: true },
  })
  if (!booking) return JSON.stringify({ ok: false, error: 'نوبت یافت نشد' })
  const pending = await prisma.salonAgentPendingAction.create({
    data: {
      businessId: ctx.businessId,
      conversationId: ctx.conversationId,
      action: 'cancel',
      payload: JSON.stringify({ bookingId }),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  })
  return JSON.stringify({
    ok: true,
    pendingId: pending.id,
    summary: `لغو ${booking.offering.name} — ${booking.reference}`,
  })
}

async function confirmCancel(ctx: ToolContext, args: Record<string, unknown>) {
  const pending = await loadPending(ctx, String(args.pendingId || ''), 'cancel')
  if (!pending.ok) return JSON.stringify(pending)
  const payload = pending.data as { bookingId: string }
  try {
    await cancelBooking({
      businessId: ctx.businessId,
      bookingId: payload.bookingId,
      phone: ctx.guestPhone!,
    })
    await prisma.salonAgentPendingAction.update({
      where: { id: pending.id },
      data: { consumedAt: new Date() },
    })
    return JSON.stringify({ ok: true, message: 'نوبت لغو شد' })
  } catch (error) {
    return JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'خطا' })
  }
}

async function searchFaqs(businessId: string, query: string) {
  const q = query.trim()
  const rows = await prisma.salonAgentFaq.findMany({
    where: { businessId },
    orderBy: { sortOrder: 'asc' },
  })
  const hits = q
    ? rows.filter(
        (f) => f.question.includes(q) || f.answer.includes(q) || q.includes(f.question.slice(0, 4)),
      )
  : rows.slice(0, 5)
  return JSON.stringify({ ok: true, faqs: hits.map((f) => ({ question: f.question, answer: f.answer })) })
}

async function loadPending(
  ctx: ToolContext,
  pendingId: string,
  action: string,
): Promise<{ ok: true; id: string; data: unknown } | { ok: false; error: string }> {
  const row = await prisma.salonAgentPendingAction.findFirst({
    where: { id: pendingId, businessId: ctx.businessId, conversationId: ctx.conversationId, action },
  })
  if (!row || row.consumedAt) return { ok: false, error: 'پیش‌نویس نامعتبر' }
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, error: 'زمان تأیید گذشته است' }
  return { ok: true, id: row.id, data: JSON.parse(row.payload) }
}

export function parseAllowedActions(raw: string): AllowedActions {
  try {
    return JSON.parse(raw) as AllowedActions
  } catch {
    return {}
  }
}
