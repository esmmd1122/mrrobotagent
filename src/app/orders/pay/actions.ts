'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { findOrderByCustomerAccess } from '@/modules/commerce/order-access'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { prisma } from '@/lib/db'
import { verifyAndApplyPayment } from '@/modules/payment/service'
import { isPaymentSandboxAllowed } from '@/modules/payment/environment'
import { headers } from 'next/headers'

const schema = z.object({
  paymentId: z.string().uuid(),
  orderNumber: z.string().min(4),
  viewToken: z.string().min(16).optional(),
  amount: z.coerce.number().positive(),
  exp: z.coerce.number(),
  proof: z.string().min(10),
})

function appOriginFromHeaders() {
  const h = headers()
  return (async () => {
    const hdrs = await h
    const host = hdrs.get('x-forwarded-host') || hdrs.get('host')
    const proto = hdrs.get('x-forwarded-proto') || 'http'
    return host ? `${proto}://${host}` : 'http://localhost:3000'
  })()
}

export async function confirmSandboxPayment(formData: FormData) {
  if (!isPaymentSandboxAllowed()) {
    redirect('/orders/pay?error=sandbox_disabled')
  }

  const viewToken = String(formData.get('viewToken') || '')
  const parsed = schema.safeParse({
    paymentId: formData.get('paymentId'),
    orderNumber: formData.get('orderNumber'),
    viewToken: viewToken || undefined,
    amount: formData.get('amount'),
    exp: formData.get('exp'),
    proof: formData.get('proof'),
  })
  if (!parsed.success) redirect('/checkout?error=invalid')

  const session = await getCustomerSession()
  let authorized = false
  if (viewToken) {
    const order = await findOrderByCustomerAccess(parsed.data.orderNumber, viewToken)
    authorized = Boolean(order?.payments.some((p) => p.id === parsed.data.paymentId))
    if (!authorized) {
      redirect(
        `/orders/track?orderNumber=${encodeURIComponent(parsed.data.orderNumber)}&token=${encodeURIComponent(viewToken)}&error=forbidden`,
      )
    }
  } else if (session) {
    const payment = await prisma.payment.findFirst({
      where: {
        id: parsed.data.paymentId,
        order: { orderNumber: parsed.data.orderNumber, customerId: session.sub },
      },
    })
    authorized = Boolean(payment)
    if (!authorized) {
      redirect(`/account/orders?error=forbidden`)
    }
  } else {
    redirect('/account/login')
  }

  const origin = await appOriginFromHeaders()
  const result = await verifyAndApplyPayment(
    parsed.data.paymentId,
    'sandbox',
    origin,
    {
      paymentId: parsed.data.paymentId,
      amount: parsed.data.amount,
      exp: parsed.data.exp,
      proof: parsed.data.proof,
    },
  )

  if (!result.ok) {
    redirect(
      `/orders/pay?paymentId=${parsed.data.paymentId}&orderNumber=${encodeURIComponent(parsed.data.orderNumber)}&exp=${parsed.data.exp}&proof=${encodeURIComponent(parsed.data.proof)}&error=${encodeURIComponent(result.message)}`,
    )
  }

  if (viewToken) {
    redirect(
      `/orders/track?orderNumber=${encodeURIComponent(parsed.data.orderNumber)}&token=${encodeURIComponent(viewToken)}&paid=1`,
    )
  }
  if (session) {
    const order = await prisma.order.findFirst({
      where: { orderNumber: parsed.data.orderNumber, customerId: session.sub },
      select: { id: true },
    })
    if (order) redirect(`/account/orders/${order.id}?paid=1`)
  }
  redirect(`/account/orders?paid=1`)
}