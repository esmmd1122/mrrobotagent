'use server'

import { randomUUID } from 'crypto'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { getProductBySlugFromDb } from '@/lib/catalog'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { createOrderFromCart } from '@/modules/commerce/create-order'
import { isProductPurchasable } from '@/modules/commerce/product-pricing'
import { parseProductPurchaseFields, validatePurchaseFieldAnswers } from '@/modules/commerce/purchase-fields'
import { resolveAppOrigin } from '@/modules/commerce/app-origin'
import { redirectAfterOrderPayment } from '@/modules/commerce/redirect-to-payment'

const baseSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.union([z.literal(''), z.string().email()]),
  phone: z.string().max(20),
  discountCode: z.string().max(32).optional(),
  termsAccepted: z.literal('on'),
  idempotencyKey: z.string().uuid(),
  planId: z.string().uuid().optional(),
})

export async function submitSubscriptionCheckout(slug: string, formData: FormData) {
  const product = await getProductBySlugFromDb(slug)
  if (!product) notFound()

  if (
    !isProductPurchasable({
      price: product.price,
      promoPrice: product.promoPrice,
      isAvailable: product.isAvailable,
      isVisible: product.isVisible,
      plansEnabled: product.plansEnabled,
      activePlans: product.plans,
    })
  ) {
    redirect(`/subscriptions/${slug}?error=not_purchasable`)
  }

  const fieldDefs = parseProductPurchaseFields(product.purchaseFieldsJson ?? '[]')
  const fieldsCheck = validatePurchaseFieldAnswers(fieldDefs, formData)
  if (!fieldsCheck.ok) {
    redirect(`/subscriptions/${slug}/buy?error=${encodeURIComponent(fieldsCheck.error)}`)
  }

  const parsed = baseSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') || '',
    phone: formData.get('phone') || '',
    discountCode: formData.get('discountCode') || '',
    termsAccepted: formData.get('termsAccepted'),
    idempotencyKey: formData.get('idempotencyKey'),
    planId: formData.get('planId') || undefined,
  })

  if (!parsed.success) {
    redirect(`/subscriptions/${slug}/buy?error=invalid`)
  }

  const customerSession = await getCustomerSession()
  if (product.plansEnabled) {
    const pid = parsed.data.planId
    if (!pid || !product.plans.some((p) => p.id === pid)) {
      redirect(`/subscriptions/${slug}/buy?error=${encodeURIComponent('طرح انتخاب‌شده نامعتبر است.')}`)
    }
  } else if (parsed.data.planId) {
    redirect(`/subscriptions/${slug}/buy?error=invalid_plan`)
  }

  const result = await createOrderFromCart({
    lines: [{ productId: product.id, planId: parsed.data.planId ?? null, quantity: 1 }],
    name: parsed.data.name,
    email: parsed.data.email || customerSession?.email || null,
    phone: parsed.data.phone || null,
    discountCode: parsed.data.discountCode || null,
    termsAccepted: true,
    idempotencyKey: parsed.data.idempotencyKey,
    loggedInCustomerId: customerSession?.sub,
    customerPurchaseInfo: fieldsCheck.deliveryInfo || null,
  })

  if (!result.ok) {
    redirect(`/subscriptions/${slug}/buy?error=${encodeURIComponent(result.error)}`)
  }

  const origin = await resolveAppOrigin()
  await redirectAfterOrderPayment({
    orderNumber: result.orderNumber,
    viewToken: result.viewToken,
    customerSessionId: customerSession?.sub,
    appOrigin: origin,
  })
}

export async function newSubscriptionCheckoutIdempotencyKey() {
  return randomUUID()
}