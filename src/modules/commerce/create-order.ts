import { prisma } from '@/lib/db'
import { validateCheckoutPricing } from './pricing'
import type { CartLineInput } from './types'
import { generateCustomerViewToken, generateOrderNumber } from './order-number'
import { hashOrderViewToken } from './order-access'
import { validateDiscountCode } from './discount'
import { notifyCustomer, copyForNotificationType } from '../notifications/service'

export type CreateOrderInput = {
  lines: CartLineInput[]
  name: string
  email: string | null
  phone: string | null
  discountCode?: string | null
  termsAccepted: boolean
  idempotencyKey: string
  /** When set, order must attach to this customer (logged-in checkout). */
  loggedInCustomerId?: string | null
  /** Customer-provided purchase / fulfillment details (server-validated JSON or text). */
  customerPurchaseInfo?: string | null
}

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNumber: string; viewToken: string }
  | { ok: false; error: string }

export async function createOrderFromCart(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!input.termsAccepted) {
    return { ok: false, error: 'پذیرش قوانین و شرایط الزامی است.' }
  }
  if (!input.name.trim()) {
    return { ok: false, error: 'نام مشتری الزامی است.' }
  }
  if (!input.email?.trim() && !input.phone?.trim()) {
    return { ok: false, error: 'حداقل ایمیل یا شماره تماس الزامی است.' }
  }
  if (input.lines.length === 0) {
    return { ok: false, error: 'سبد خرید خالی است.' }
  }

  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true, orderNumber: true },
  })
  if (existing) {
    return {
      ok: false,
      error: 'این درخواست قبلاً پردازش شده است. از لینک پیگیری سفارش استفاده کنید.',
    }
  }

  const checkoutPricing = await validateCheckoutPricing(input.lines, input.discountCode)
  if (!checkoutPricing.ok) {
    return { ok: false, error: checkoutPricing.error }
  }
  const pricing = checkoutPricing.pricing

  if (input.discountCode?.trim() && !pricing.discountCode) {
    const discountCheck = await validateDiscountCode(
      input.discountCode,
      pricing.lines,
      pricing.subtotal,
    )
    return { ok: false, error: discountCheck.error || 'کد تخفیف نامعتبر است.' }
  }

  const viewToken = generateCustomerViewToken()
  const viewTokenHash = hashOrderViewToken(viewToken)
  const orderNumber = generateOrderNumber()
  const email = input.email?.trim().toLowerCase() || null
  const phone = input.phone?.trim() || null
  const trimmedName = input.name.trim()

  try {
    const order = await prisma.$transaction(async (tx) => {
      let customer: Awaited<ReturnType<typeof tx.customer.findFirst>> = null

      if (input.loggedInCustomerId) {
        customer = await tx.customer.findUnique({ where: { id: input.loggedInCustomerId } })
        if (!customer || customer.status !== 'ACTIVE') {
          throw new Error('CUSTOMER_SESSION_INVALID')
        }
        if (email && customer.email && customer.email !== email) {
          throw new Error('EMAIL_MISMATCH')
        }
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: trimmedName,
            email: email || customer.email,
            phone: phone || customer.phone,
          },
        })
      } else {
        customer = await tx.customer.findFirst({
          where: {
            OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
          },
        })
        if (!customer) {
          customer = await tx.customer.create({
            data: { name: trimmedName, email, phone, status: 'ACTIVE' },
          })
        } else if (!customer.passwordHash) {
          // Only backfill missing contact fields on unauthenticated guest records;
          // never overwrite a registered customer account's profile from guest checkout.
          const updateData: { email?: string; phone?: string } = {}
          if (!customer.email && email) updateData.email = email
          if (!customer.phone && phone) updateData.phone = phone
          if (Object.keys(updateData).length > 0) {
            customer = await tx.customer.update({
              where: { id: customer.id },
              data: updateData,
            })
          }
        }
      }

      const lineSum = pricing.lines.reduce((s, l) => s + l.lineTotal, 0)
      const expectedTotal = Math.max(0, lineSum - pricing.discountAmount)
      if (
        Math.round(pricing.subtotal) !== Math.round(lineSum) ||
        Math.round(pricing.total) !== Math.round(expectedTotal)
      ) {
        throw new Error('PRICE_INTEGRITY')
      }

      if (pricing.discountCode) {
        const now = new Date()
        const disc = await tx.discountCode.findUnique({ where: { code: pricing.discountCode } })
        if (!disc || !disc.isActive) throw new Error('DISCOUNT_INVALID')
        if (disc.startsAt && disc.startsAt > now) throw new Error('DISCOUNT_INVALID')
        if (disc.expiresAt && disc.expiresAt < now) throw new Error('DISCOUNT_INVALID')

        const updated = await tx.discountCode.updateMany({
          where: {
            id: disc.id,
            isActive: true,
            ...(disc.usageLimit != null ? { usageCount: { lt: disc.usageLimit } } : {}),
          },
          data: { usageCount: { increment: 1 } },
        })
        if (updated.count === 0) {
          throw new Error('DISCOUNT_EXHAUSTED')
        }
      }

      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'UNPAID',
          subtotalAmount: pricing.subtotal,
          discountAmount: pricing.discountAmount,
          totalAmount: expectedTotal,
          currency: pricing.currency,
          discountCode: pricing.discountCode,
          termsAcceptedAt: new Date(),
          idempotencyKey: input.idempotencyKey,
          customerViewTokenHash: viewTokenHash,
          fulfillmentType: 'MANUAL',
          fulfillmentStatus: 'PENDING',
          deliveryInfo: input.customerPurchaseInfo?.trim() || null,
          items: {
            create: pricing.lines.map((l) => ({
              productId: l.productId,
              planId: l.planId ?? null,
              productSlug: l.slug,
              productName: l.productName,
              planTitle: l.planTitle ?? null,
              planDurationValue: l.planDurationValue ?? null,
              planDurationUnit: l.planDurationUnit ?? null,
              planFulfillmentInstructions: l.planFulfillmentInstructions ?? null,
              quantity: l.quantity,
              listUnitPrice: l.listUnitPrice,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
            })),
          },
          fulfillment: {
            create: {
              type: 'MANUAL',
              status: 'PENDING',
              deliveryInfo: input.customerPurchaseInfo?.trim() || null,
            },
          },
        },
      })

      return created
    })

    try {
      const copy = copyForNotificationType('ORDER_REGISTERED', order.orderNumber)
      await notifyCustomer({
        customerId: order.customerId,
        orderId: order.id,
        type: 'ORDER_REGISTERED',
        title: copy.title,
        body: copy.body,
      })
    } catch (notifyErr) {
      console.error(
        'Order registered notification failed:',
        notifyErr instanceof Error ? notifyErr.message : 'unknown',
      )
    }

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      viewToken,
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'CUSTOMER_SESSION_INVALID') {
      return { ok: false, error: 'نشست حساب کاربری نامعتبر است. دوباره وارد شوید.' }
    }
    if (e instanceof Error && e.message === 'EMAIL_MISMATCH') {
      return { ok: false, error: 'ایمیل وارد شده با حساب کاربری شما همخوانی ندارد.' }
    }
    if (e instanceof Error && e.message === 'DISCOUNT_INVALID') {
      return { ok: false, error: 'کد تخفیف معتبر نیست یا منقضی شده است.' }
    }
    if (e instanceof Error && e.message === 'DISCOUNT_EXHAUSTED') {
      return { ok: false, error: 'سقف استفاده از این کد تخفیف تکمیل شده است.' }
    }
    if (e instanceof Error && e.message === 'PRICE_INTEGRITY') {
      return { ok: false, error: 'خطای یکپارچگی قیمت. لطفاً دوباره تلاش کنید.' }
    }
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
      return { ok: false, error: 'این درخواست قبلاً ثبت شده است. لطفاً از بخش پیگیری سفارش بررسی کنید.' }
    }
    throw e
  }
}