import { tool } from 'ai'
import { z } from 'zod'
import { BookingService } from '@/services/bookingService'

export const createBookingTools = (businessSlug: string) => {
  return {
    // ابزار ۱: گرفتن لیست خدمات و ساعت‌های کاری سالن
    getBusinessInfo: tool({
      description: 'گرفتن اطلاعات سالن، لیست خدمات، قیمت‌ها و ساعت‌های کاری',
      parameters: z.object({}),
      execute: async () => {
        try {
          const business = await BookingService.getBusinessDetails(businessSlug)
          return { success: true, business }
        } catch (error: any) {
          return { success: false, error: error.message }
        }
      },
    }),

    // ابزار ۲: ثبت نوبت برای مشتری
    bookAppointment: tool({
      description: 'ثبت نوبت جدید برای مشتری در سیستم با وضعیت در انتظار تایید',
      parameters: z.object({
        phone: z.string().describe('شماره تماس مشتری'),
        name: z.string().optional().describe('نام مشتری'),
        serviceId: z.string().describe('شناسه سرویس مورد نظر'),
        startTime: z.string().describe('زمان شروع نوبت به فرمت استاندارد ISO (مثلا 2026-06-10T10:00:00Z)'),
      }),
      execute: async ({ phone, name, serviceId, startTime }) => {
        try {
          const result = await BookingService.bookAppointment({
            businessSlug,
            phone,
            name,
            serviceId,
            startTime,
          })
          return result
        } catch (error: any) {
          return { success: false, error: error.message }
        }
      },
    }),
  }
}