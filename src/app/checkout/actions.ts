'use server'

import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { clearCart, readCart } from '@/modules/commerce/cart-cookie'
import { createOrderFromCart } from '@/modules/commerce/create-order'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { resolveAppOrigin } from '@/modules/commerce/app-origin'
import { redirectAfterOrderPayment } from '@/modules/commerce/redirect-to-payment'
import { validateCheckoutContact } from '@/modules/commerce/error-messages'

const uuidSchema = z.string().uuid()

export async function submitCheckout(formData: FormData) {
  const idempotencyKey = String(formData.get('idempotencyKey') || '')
  if (!uuidSchema.safeParse(idempotencyKey).success) {
    redirect(`/checkout?error=${encodeURIComponent('شناسه درخواست نامعتبر است. لطفاً صفحه را بازنشانی کنید.')}`)
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
    redirect(`/checkout?error=${encodeURIComponent(contact.error)}`)
  }

  const lines = await readCart()
  const result = await createOrderFromCart({
    lines,
    name: contact.name,
    email: contact.email || customerSession?.email || null,
    phone: contact.phone || null,
    discountCode: contact.discountCode || null,
    termsAccepted: true,
    idempotencyKey,
    loggedInCustomerId: customerSession?.sub,
  })

  if (!result.ok) {
    redirect(`/checkout?error=${encodeURIComponent(result.error)}`)
  }

  await clearCart()
  const origin = await resolveAppOrigin()
  await redirectAfterOrderPayment({
    orderNumber: result.orderNumber,
    viewToken: result.viewToken,
    customerSessionId: customerSession?.sub,
    appOrigin: origin,
  })
}

export async function newCheckoutIdempotencyKey() {
  return randomUUID()
}