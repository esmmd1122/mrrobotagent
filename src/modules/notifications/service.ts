import { prisma } from '@/lib/db'
import type { CustomerNotificationType } from './types'
import { sendCustomerEmail } from './providers/email'
import { sendCustomerSms } from './providers/sms'

export type NotifyCustomerInput = {
  customerId: string
  orderId?: string
  type: CustomerNotificationType
  title: string
  body: string
}

function deliveryStatusFromAttempts(emailAttempted: boolean, smsAttempted: boolean) {
  if (!emailAttempted && !smsAttempted) return 'IN_APP_ONLY'
  return 'RECORDED'
}

export async function notifyCustomer(input: NotifyCustomerInput) {
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { id: true, email: true, phone: true, status: true },
  })
  if (!customer || customer.status !== 'ACTIVE') return null

  if (input.orderId) {
    const owned = await prisma.order.findFirst({
      where: { id: input.orderId, customerId: customer.id },
      select: { id: true },
    })
    if (!owned) return null
  }

  let emailAttempted = false
  let smsAttempted = false

  if (customer.email) {
    emailAttempted = true
    await sendCustomerEmail({
      to: customer.email,
      subject: input.title,
      text: input.body,
    })
  }
  if (customer.phone) {
    smsAttempted = true
    await sendCustomerSms({
      to: customer.phone,
      body: `${input.title}\n${input.body}`,
    })
  }

  return prisma.customerNotification.create({
    data: {
      customerId: customer.id,
      orderId: input.orderId,
      type: input.type,
      title: input.title,
      body: input.body,
      channel: 'IN_APP',
      deliveryStatus: deliveryStatusFromAttempts(emailAttempted, smsAttempted),
      emailAttempted,
      smsAttempted,
    },
  })
}

export async function countUnreadNotifications(customerId: string) {
  return prisma.customerNotification.count({
    where: { customerId, readAt: null },
  })
}

export async function listCustomerNotifications(customerId: string, take = 40) {
  return prisma.customerNotification.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      order: { select: { orderNumber: true } },
    },
  })
}

export async function markNotificationRead(customerId: string, notificationId: string) {
  const row = await prisma.customerNotification.findFirst({
    where: { id: notificationId, customerId },
    select: { id: true },
  })
  if (!row) return false
  await prisma.customerNotification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  })
  return true
}

export async function markAllNotificationsRead(customerId: string) {
  await prisma.customerNotification.updateMany({
    where: { customerId, readAt: null },
    data: { readAt: new Date() },
  })
}

export function copyForNotificationType(
  type: CustomerNotificationType,
  orderNumber: string,
): { title: string; body: string } {
  switch (type) {
    case 'ORDER_REGISTERED':
      return {
        title: 'سفارش ثبت شد',
        body: `سفارش ${orderNumber} با موفقیت ثبت شد. در صورت نیاز پرداخت را تکمیل کنید.`,
      }
    case 'PAYMENT_CONFIRMED':
      return {
        title: 'پرداخت تأیید شد',
        body: `پرداخت سفارش ${orderNumber} تأیید شد و سفارش وارد صف پردازش می‌شود.`,
      }
    case 'ORDER_PROCESSING':
      return {
        title: 'سفارش در حال پردازش',
        body: `سفارش ${orderNumber} توسط تیم ما در حال آماده‌سازی است.`,
      }
    case 'INFO_REQUIRED':
      return {
        title: 'نیاز به اطلاعات بیشتر',
        body: `برای ادامه تحویل سفارش ${orderNumber} لطفاً جزئیات درخواستی را در پنل حساب کاربری بررسی کنید.`,
      }
    case 'DELIVERY_READY':
      return {
        title: 'تحویل آماده است',
        body: `سفارش ${orderNumber} تحویل داده شد. فایل‌ها و جزئیات را در حساب کاربری ببینید.`,
      }
    case 'FULFILLMENT_FAILED':
      return {
        title: 'مشکل در تحویل',
        body: `تحویل سفارش ${orderNumber} با مشکل مواجه شد. پشتیبانی با شما تماس خواهد گرفت.`,
      }
    default:
      return { title: 'اعلان سفارش', body: `به‌روزرسانی سفارش ${orderNumber}` }
  }
}