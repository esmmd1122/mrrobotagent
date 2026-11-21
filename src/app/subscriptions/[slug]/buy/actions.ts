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
import { validateCheckoutContact } from '@/modules/commerce/error-messages'

const uuidSchema = z.string().uuid()

function buyErrorRedirect(slug: string, error: string, planId?: string | null): never {
  const qs = new URLSearchParams({ error })
  if (planId) qs.set('planId', planId)
  redirect(`/subscriptions/${slug}/buy?${qs.toString()}`)
}

export async function submitSubscriptionCheckout(slug: string, formData: FormData) {
  const product = await getProductBySlugFromDb(slug)
  if (!product) notFound()

  const rawPlanId = String(formData.get('planId') || '').trim() || undefined

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
    buyErrorRedirect(slug, fieldsCheck.error, rawPlanId)
  }

  const idempotencyKey = String(formData.get('idempotencyKey') || '')
  if (!uuidSchema.safeParse(idempotencyKey).success) {
    buyErrorRedirect(slug, 'شناسه درخواست نامعتبر است. لطفاً صفحه را بازنشانی کنید.', rawPlanId)
  }

  const customerSession = await getCustomerSession()
  const contact = validateCheckoutContact({
    name: String(formData.get('name') || ''),
    email: String(formData.get('email') || ''),
    phone: String(formData.get('phone') || ''),
    discountCode: String(formData.get('discountCode') || ''),
    termsAccepted: formData.get('termsAccepted') === 'on',
    fallbackEmail: customerSession?.email,
  })

  if (!contact.ok) {
    buyErrorRedirect(slug, contact.error, rawPlanId)
  }

  if (product.plansEnabled) {
    if (!rawPlanId || !uuidSchema.safeParse(rawPlanId).success || !product.plans.some((p) => p.id === rawPlanId)) {
      buyErrorRedirect(slug, 'طرح انتخاب‌شده نامعتبر است.')
    }
  } else if (rawPlanId) {
    buyErrorRedirect(slug, 'طرح انتخاب‌شده برای این محصول معتبر نیست.')
  }

  const result = await createOrderFromCart({
    lines: [{ productId: product.id, planId: rawPlanId ?? null, quantity: 1 }],
    name: contact.name,
    email: contact.email || customerSession?.email || null,
    phone: contact.phone || null,
    discountCode: contact.discountCode || null,
    termsAccepted: true,
    idempotencyKey,
    loggedInCustomerId: customerSession?.sub,
    customerPurchaseInfo: fieldsCheck.deliveryInfo || null,
  })

  if (!result.ok) {
    buyErrorRedirect(slug, result.error, rawPlanId)
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