import { prisma } from '@/lib/db'

export class BookingRepository {
  // گرفتن اطلاعات سالن و سرویس‌ها با استفاده از slug
  static async getBusinessBySlug(slug: string) {
    return await prisma.business.findUnique({
      where: { slug },
      include: { services: true, workingHours: true },
    })
  }

  // پیدا کردن یا ساختن کاربر بر اساس شماره تماس
  static async getOrCreateUser(phone: string, name?: string) {
    return await prisma.user.upsert({
      where: { phone },
      update: { name: name || undefined },
      create: { phone, name },
    })
  }

  // ثبت نوبت جدید با وضعیت پیش‌فرض PENDING (در انتظار تایید مدیر)
  static async createAppointment(data: {
    businessId: string
    userId: string
    serviceId: string
    startTime: Date
    endTime: Date
  }) {
    return await prisma.appointment.create({
      data: {
        businessId: data.businessId,
        userId: data.userId,
        serviceId: data.serviceId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'PENDING',
      },
      include: {
        service: true,
        user: true,
      },
    })
  }
}