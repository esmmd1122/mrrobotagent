import { BookingRepository } from '@/repositories/bookingRepository'

export class BookingService {
  // گرفتن اطلاعات سالن و سرویس‌ها
  static async getBusinessDetails(slug: string) {
    const business = await BookingRepository.getBusinessBySlug(slug)
    if (!business) {
      throw new Error('سالن مورد نظر یافت نشد.')
    }
    return business
  }

  // ثبت نوبت نهایی برای مشتری
  static async bookAppointment(data: {
    businessSlug: string
    phone: string
    name?: string
    serviceId: string
    startTime: string // مثال: "2026-06-10T10:00:00Z"
  }) {
    const business = await this.getBusinessDetails(data.businessSlug)
    
    // پیدا کردن یا ساخت کاربر
    const user = await BookingRepository.getOrCreateUser(data.phone, data.name)

    // پیدا کردن سرویس مورد نظر برای فهمیدن مدت زمان آن
    const service = business.services.find(
      (s: { id: string; durationMinutes: number }) => s.id === data.serviceId,
    )
    if (!service) {
      throw new Error('سرویس انتخاب شده معتبر نیست.')
    }

    const start = new Date(data.startTime)
    // محاسبه زمان پایان نوبت بر اساس مدت زمان سرویس
    const end = new Date(start.getTime() + service.durationMinutes * 60000)

    // ثبت نوبت در دیتابیس با وضعیت PENDING
    const appointment = await BookingRepository.createAppointment({
      businessId: business.id,
      userId: user.id,
      serviceId: service.id,
      startTime: start,
      endTime: end,
    })

    return {
      success: true,
      message: 'نوبت شما با موفقیت ثبت شد و در انتظار تایید مدیریت است.',
      appointment,
    }
  }
}