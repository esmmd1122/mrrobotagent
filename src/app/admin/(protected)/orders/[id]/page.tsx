import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PERMISSIONS } from '@/lib/auth/constants'
import { updateOrder } from '../actions'
import { FulfillmentPanel } from '@/components/admin/FulfillmentPanel'
import { ensureFulfillmentForOrder } from '@/modules/fulfillment/service'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'
import { formatPurchaseInfoForAdmin } from '@/modules/commerce/purchase-fields'

type Props = { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  await requireAdmin(PERMISSIONS.ORDERS_MANAGE)
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      payments: true,
      fulfillment: { include: { files: { orderBy: { createdAt: 'desc' } } } },
    },
  })
  if (!order) notFound()

  const fulfillment = order.fulfillment ?? (await ensureFulfillmentForOrder(order.id))
  const assignedAdmin = fulfillment.assignedAdminId
    ? await prisma.adminUser.findUnique({ where: { id: fulfillment.assignedAdminId }, select: { name: true, email: true } })
    : null
  const action = updateOrder.bind(null, id)
  const hasVerifiedPayment = order.payments.some((p) => p.status === 'VERIFIED')
  const customerPurchaseText = formatPurchaseInfoForAdmin(order.deliveryInfo)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">سفارش {order.orderNumber}</h1>
      <div className="admin-card p-4 text-sm">
        <p>مشتری: {order.customer.name}</p>
        <p>تماس: {order.customer.phone || order.customer.email || '—'}</p>
        {customerPurchaseText ? (
          <div className="mt-3 rounded border border-[#2a2b35] p-3">
            <p className="text-xs text-[#9297A3]">اطلاعات خرید (مشتری)</p>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">{customerPurchaseText}</pre>
          </div>
        ) : null}
      </div>
      <div className="admin-card grid gap-1 p-4 text-sm sm:grid-cols-2">
        <p>جمع جزء: {order.subtotalAmount.toLocaleString('fa-IR')}</p>
        <p>تخفیف: {order.discountAmount.toLocaleString('fa-IR')} {order.discountCode ? `(${order.discountCode})` : ''}</p>
        <p>مبلغ نهایی: {order.totalAmount.toLocaleString('fa-IR')}</p>
        <p>پرداخت: {order.paymentStatus}</p>
        <p>تحویل: {FULFILLMENT_STATUS_LABELS[fulfillment.status] || fulfillment.status}</p>
      </div>
      <ul className="admin-card space-y-2 p-4 text-sm">
        {order.items.map((i) => (
          <li key={i.id}>
            {i.productName}
            {i.planTitle ? ` — ${i.planTitle}` : ''} × {i.quantity} — {i.lineTotal.toLocaleString('fa-IR')}
            {i.planDurationUnit ? (
              <span className="mr-1 text-xs text-white/45">
                ({i.planDurationValue ?? ''} {i.planDurationUnit})
              </span>
            ) : null}
            {i.planFulfillmentInstructions ? (
              <p className="mt-1 text-xs text-amber-200/80 whitespace-pre-wrap">
                دستور تحویل طرح: {i.planFulfillmentInstructions}
              </p>
            ) : null}
            {i.listUnitPrice > i.unitPrice ? (
              <span className="mr-2 text-xs text-white/45"> (لیست: {i.listUnitPrice.toLocaleString('fa-IR')})</span>
            ) : null}
          </li>
        ))}
      </ul>

      <FulfillmentPanel
        orderId={order.id}
        paymentStatus={order.paymentStatus}
        fulfillmentStatus={fulfillment.status}
        assignedAdminId={fulfillment.assignedAdminId}
        assignedAdminName={assignedAdmin?.name || null}
        assignedAt={fulfillment.assignedAt?.toISOString() || null}
        internalNotes={fulfillment.internalNotes}
        deliveryInfo={fulfillment.deliveryInfo}
        failureReason={fulfillment.failureReason}
        files={(order.fulfillment?.files ?? []).map((f) => ({
          id: f.id,
          filename: f.filename,
          url: f.url,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          createdAt: f.createdAt.toISOString(),
        }))}
      />

      <form action={action} className="admin-card max-w-xl space-y-3 p-4">
        <h2 className="font-semibold text-sm text-[#9297A3]">ویرایش سریع سفارش</h2>
        <label className="block text-sm">
          وضعیت سفارش
          <select name="status" defaultValue={order.status} className="admin-input mt-1">
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          وضعیت پرداخت
          <select name="paymentStatus" defaultValue={order.paymentStatus} className="admin-input mt-1">
            {['UNPAID', 'PAID', 'FAILED', 'REFUNDED'].map((s) => (
              <option key={s} value={s} disabled={s === 'PAID' && !hasVerifiedPayment}>
                {s}
                {s === 'PAID' && !hasVerifiedPayment ? ' (نیاز به Payment تأیید‌شده)' : ''}
              </option>
            ))}
          </select>
          {!hasVerifiedPayment ? (
            <p className="mt-1 text-xs text-amber-400">PAID فقط پس از تأیید درگاه (رکورد Payment با وضعیت VERIFIED) قابل تنظیم است.</p>
          ) : null}
        </label>
        <textarea
          name="adminNotes"
          className="admin-input min-h-20"
          defaultValue={order.adminNotes || ''}
          placeholder="یادداشت داخلی سفارش"
        />
        <button type="submit" className="rounded-lg bg-[#e10600] px-4 py-2 text-sm font-semibold">
          ذخیره سفارش
        </button>
      </form>

      {order.payments.length > 0 ? (
        <section className="admin-card space-y-2 p-4 text-sm">
          <h2 className="font-semibold">پرداخت‌ها</h2>
          {order.payments.map((p) => (
            <div key={p.id} className="rounded border border-[#2a2b35] p-2">
              <p className="text-white/90">
                {p.provider} — {p.status} — {p.amount.toLocaleString('fa-IR')}
              </p>
              {p.referenceId ? <p className="text-xs text-white/45" dir="ltr">ref: {p.referenceId}</p> : null}
              {p.failureReason ? <p className="text-xs text-red-300">{p.failureReason}</p> : null}
              {p.verifiedAt ? (
                <p className="text-xs text-white/45">
                  تأیید: {new Date(p.verifiedAt).toLocaleString('fa-IR')}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}