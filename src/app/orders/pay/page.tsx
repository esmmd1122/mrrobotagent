import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { isPaymentSandboxAllowed } from '@/modules/payment/environment'
import { findOrderByCustomerAccess } from '@/modules/commerce/order-access'
import { SandboxPayForm } from './SandboxPayForm'

type Props = {
  searchParams: Promise<{
    paymentId?: string
    orderNumber?: string
    exp?: string
    proof?: string
    viewToken?: string
  }>
}

export default async function OrderPayPage({ searchParams }: Props) {
  const sp = await searchParams
  const { paymentId, orderNumber, exp, proof, viewToken } = sp
  if (!paymentId || !orderNumber || !exp || !proof) notFound()

  if (!isPaymentSandboxAllowed()) {
    return (
      <div className="section-glow pt-24 pb-20 text-center">
        <p className="text-mr-muted">پرداخت آزمایشی در production غیرفعال است.</p>
        <Link href="/" className="mt-4 inline-block text-mr-red underline">
          بازگشت
        </Link>
      </div>
    )
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  })
  if (!payment || payment.order.orderNumber !== orderNumber) notFound()

  return (
    <div className="section-glow pt-24 pb-20">
      <div className="mx-auto max-w-md px-4">
        <article className="card-shop space-y-4 p-6">
          <h1 className="text-xl font-bold">درگاه آزمایشی (فقط توسعه)</h1>
          <p className="text-sm text-mr-muted">
            این صفحه فقط با <code className="text-white/80">ALLOW_PAYMENT_SANDBOX=true</code> در محیط
            غیر-production فعال است. هیچ پرداخت واقعی انجام نمی‌شود.
          </p>
          <p className="text-sm">
            سفارش: <strong dir="ltr">{orderNumber}</strong>
          </p>
          <p className="text-sm tabular-nums">
            مبلغ: {payment.amount.toLocaleString('fa-IR')} {payment.currency}
          </p>
          <SandboxPayForm
            paymentId={paymentId}
            orderNumber={orderNumber}
            amount={payment.amount}
            exp={exp}
            proof={proof}
            viewToken={viewToken}
          />
        </article>
      </div>
    </div>
  )
}