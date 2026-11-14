'use server'

import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { clearCart, readCart } from '@/modules/commerce/cart-cookie'
import { createOrderFromCart } from '@/modules/commerce/create-order'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { resolveAppOrigin } from '@/modules/commerce/app-origin'
import { redirectAfterOrderPayment } from '@/modules/commerce/redirect-to-payment'

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.union([z.literal(''), z.string().email()]),
  phone: z.string().max(20),
  discountCode: z.string().max(32).optional(),
  termsAccepted: z.literal('on'),
  idempotencyKey: z.string().uuid(),
})

export async function submitCheckout(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') || '',
    phone: formData.get('phone') || '',
    discountCode: formData.get('discountCode') || '',
    termsAccepted: formData.get('termsAccepted'),
    idempotencyKey: formData.get('idempotencyKey'),
  })

  if (!parsed.success) {
    redirect('/checkout?error=invalid')
  }

  const lines = await readCart()
  const customerSession = await getCustomerSession()
  const result = await createOrderFromCart({
    lines,
    name: parsed.data.name,
    email: parsed.data.email || customerSession?.email || null,
    phone: parsed.data.phone || null,
    discountCode: parsed.data.discountCode || null,
    termsAccepted: true,
    idempotencyKey: parsed.data.idempotencyKey,
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