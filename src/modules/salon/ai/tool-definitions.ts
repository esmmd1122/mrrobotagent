import type { ToolDefinition } from './types'

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'getBusinessInfo',
    description: 'اطلاعات سالن شامل نام، آدرس، تلفن و ساعت کاری',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'getServices',
    description: 'لیست خدمات فعال با قیمت و مدت',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'getEmployees',
    description: 'لیست پرسنل فعال',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'getAvailableSlots',
    description: 'زمان‌های آزاد برای یک خدمت در یک تاریخ YYYY-MM-DD',
    parameters: {
      type: 'object',
      properties: {
        offeringId: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        employeeId: { type: 'string' },
      },
      required: ['offeringId', 'date'],
    },
  },
  {
    name: 'getCustomerAppointments',
    description: 'نوبت‌های مشتری؛ فقط وقتی شماره تایید شده است',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'prepareBooking',
    description: 'پیش‌نویس رزرو؛ قبل از تایید مشتری اجرا شود',
    parameters: {
      type: 'object',
      properties: {
        offeringId: { type: 'string' },
        employeeId: { type: 'string' },
        startIso: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['offeringId', 'startIso'],
    },
  },
  {
    name: 'confirmBooking',
    description: 'ثبت قطعی نوبت پس از تایید صریح مشتری',
    parameters: {
      type: 'object',
      properties: { pendingId: { type: 'string' } },
      required: ['pendingId'],
    },
  },
  {
    name: 'prepareReschedule',
    description: 'پیش‌نویس تغییر زمان نوبت',
    parameters: {
      type: 'object',
      properties: {
        bookingId: { type: 'string' },
        newStartIso: { type: 'string' },
      },
      required: ['bookingId', 'newStartIso'],
    },
  },
  {
    name: 'confirmReschedule',
    description: 'اعمال تغییر زمان پس از تایید',
    parameters: {
      type: 'object',
      properties: { pendingId: { type: 'string' } },
      required: ['pendingId'],
    },
  },
  {
    name: 'prepareCancel',
    description: 'پیش‌نویس لغو نوبت',
    parameters: {
      type: 'object',
      properties: { bookingId: { type: 'string' } },
      required: ['bookingId'],
    },
  },
  {
    name: 'confirmCancel',
    description: 'لغو قطعی پس از تایید مشتری',
    parameters: {
      type: 'object',
      properties: { pendingId: { type: 'string' } },
      required: ['pendingId'],
    },
  },
  {
    name: 'searchFaqs',
    description: 'جستجو در پرسش‌های متداول سالن',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
]
