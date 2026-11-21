import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  CheckCircle2,
  Clock,
  Download,
  Headphones,
  PackageCheck,
  Store,
} from 'lucide-react'
import { findOrderByCustomerAccess } from '@/modules/commerce/order-access'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { StartPaymentButton } from '@/components/orders/StartPaymentButton'
import { FulfillmentProgress } from '@/components/orders/FulfillmentProgress'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'
import { buildCustomerFileDownloadUrl, createFileDownloadGrant } from '@/modules/fulfillment/file-download'
import { formatStoreMoney } from '@/modules/commerce/pricing'
import { getPaymentGatewayAvailability } from '@/modules/payment/registry'
import { paymentStatusLabelFa } from '@/modules/payment/labels'

type Props = {
  searchParams: Promise<{ orderNumber?: string; token?: string; paid?: string }>
}

export default async function OrderTrackPage({ searchParams }: Props) {
  const { orderNumber, token, paid } = await searchParams
  if (!orderNumber || !token) {
    return (
      <div className="section-glow pt-28 pb-20">
        <div className="mx-auto max-w-lg px-4">
          <article className="space-y-4 rounded-2xl border border-white/12 bg-[#0d1018] p-6 text-center sm:p-8">
            <h1 className="text-xl font-black text-white">پیگیری سفارش</h1>
            <p className="text-sm leading-relaxed text-[#a8bad8]">
              برای مشاهده وضعیت سفارش مهمان، از لینک اختصاصی پیگیری که پس از ثبت سفارش نمایش داده شده استفاده کنید. اگر با حساب کاربری سفارش داده‌اید، از بخش سفارش‌های حساب من وارد شوید.
            </p>
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:justify-center">
              <Link
                href="/account/orders"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#e10600] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#c80500]"
              >
                سفارش‌های حساب من
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-2 text-sm text-white/90 transition hover:bg-white/5"
              >
                <Headphones className="h-4 w-4 text-[#38bdf8]" />
                <span>تماس با پشتیبانی</span>
              </Link>
            </div>
          </article>
        </div>
      </div>
    )
  }

  const [order, gateway] = await Promise.all([
    findOrderByCustomerAccess(orderNumber, token),
    getPaymentGatewayAvailability(),
  ])
  if (!order) notFound()

  const fulfillmentStatus = order.fulfillment?.status || order.fulfillmentStatus
  const deliveryText = order.fulfillment?.deliveryInfo || order.deliveryInfo
  const files = order.fulfillment?.files ?? []
  const isUnpaid = order.paymentStatus !== 'PAID'

  return (
    <div className="section-glow pt-28 pb-24">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <article className="space-y-5 rounded-2xl border border-white/12 bg-[#0d1018] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-semibold text-[#ff5a56]">پیگیری زنده سفارش</p>
              <h1 className="mt-1 text-xl font-black text-white">
                سفارش{' '}
                <span dir="ltr" className="inline-block font-mono tabular-nums">
                  {order.orderNumber}
                </span>
              </h1>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                isUnpaid
                  ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
                  : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {isUnpaid ? <Clock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>{paymentStatusLabelFa(order.paymentStatus)}</span>
            </span>
          </div>

          {paid === '1' ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>پرداخت در صورت تأیید سرور ثبت شده است.</span>
            </p>
          ) : null}

          <div className="grid gap-3 rounded-xl border border-white/10 bg-[#121622] p-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs text-[#a8bad8]">وضعیت سفارش</span>
              <p className="mt-0.5 font-bold text-white">
                {ORDER_STATUS_LABELS[order.status] || order.status}
              </p>
            </div>
            <div>
              <span className="text-xs text-[#a8bad8]">وضعیت پرداخت</span>
              <p className="mt-0.5 font-bold text-white">
                {paymentStatusLabelFa(order.paymentStatus)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#121622] p-4">
            <p className="mb-2.5 flex items-center gap-2 text-sm font-bold text-white">
              <PackageCheck className="h-4 w-4 text-[#38bdf8]" />
              <span>پیشرفت تحویل</span>
            </p>
            <FulfillmentProgress current={fulfillmentStatus} />
            <p className="mt-2.5 text-xs text-[#a8bad8]">
              وضعیت فعلی تحویل: <strong className="text-white">{FULFILLMENT_STATUS_LABELS[fulfillmentStatus] || fulfillmentStatus}</strong>
            </p>
          </div>

          {isUnpaid && gateway.available ? (
            <StartPaymentButton orderNumber={order.orderNumber} viewToken={token} />
          ) : null}

          {isUnpaid && !gateway.available ? (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100">
              <p className="flex items-center gap-1.5 font-bold text-amber-200">
                <Clock className="h-4 w-4 shrink-0" />
                <span>درگاه پرداخت آنلاین فعلاً غیرفعال است</span>
              </p>
              <p className="mt-1.5">
                برای هماهنگی پرداخت و فعال‌سازی این سفارش با پشتیبانی MR.ROBOT تماس بگیرید و شماره سفارش{' '}
                <span dir="ltr" className="font-mono font-semibold text-white">
                  {order.orderNumber}
                </span>{' '}
                را ارسال کنید.
              </p>
              <Link
                href={`/contact?subject=${encodeURIComponent(`هماهنگی پرداخت سفارش ${order.orderNumber}`)}`}
                className="mt-3 inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#e10600] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#c80500]"
              >
                <Headphones className="h-3.5 w-3.5" />
                <span>ارتباط با پشتیبانی</span>
              </Link>
            </div>
          ) : null}

          {deliveryText ? (
            <div className="rounded-xl border border-white/12 bg-[#121622] p-4 text-sm">
              <p className="font-bold text-white">اطلاعات تحویل و فعال‌سازی</p>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed text-[#d7e2f5]">
                {deliveryText}
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs text-[#a8bad8]">
              هنوز اطلاعات تحویلی برای این سفارش ثبت نشده است.
            </p>
          )}

          {files.length > 0 && order.paymentStatus === 'PAID' ? (
            <div className="rounded-xl border border-white/12 bg-[#121622] p-4 text-sm">
              <p className="font-bold text-white">فایل‌های تحویل</p>
              <ul className="mt-2.5 space-y-2">
                {files.map((f) => {
                  const grant = createFileDownloadGrant(f.id, order.orderNumber, token)
                  const href = buildCustomerFileDownloadUrl(f.id, order.orderNumber, token, grant)
                  return (
                    <li key={f.id}>
                      <a
                        href={href}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#ff5a56] underline hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{f.filename}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
            <h2 className="font-bold text-white">اقلام سفارش</h2>
            <ul className="space-y-1.5">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-2 py-0.5">
                  <span className="min-w-0 break-words text-[#d7e2f5]">
                    {i.productName}
                    {i.planTitle ? ` — ${i.planTitle}` : ''} × {i.quantity.toLocaleString('fa-IR')}
                  </span>
                  <span className="shrink-0 font-semibold text-white tabular-nums">
                    {formatStoreMoney(i.lineTotal, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
            {order.discountAmount > 0 ? (
              <p className="flex justify-between text-xs text-emerald-300">
                <span>تخفیف {order.discountCode ? `(${order.discountCode})` : ''}</span>
                <span className="tabular-nums">
                  − {formatStoreMoney(order.discountAmount, order.currency)}
                </span>
              </p>
            ) : null}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-black text-white tabular-nums">
              <span>جمع نهایی</span>
              <span>{formatStoreMoney(order.totalAmount, order.currency)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row">
            <Link
              href="/shop"
              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/5"
            >
              <Store className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>بازگشت به فروشگاه</span>
            </Link>
            <Link
              href={`/contact?subject=${encodeURIComponent(`پیگیری سفارش ${order.orderNumber}`)}`}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/12 px-4 py-2 text-xs font-semibold text-[#a8bad8] transition hover:bg-white/5 hover:text-white"
            >
              <Headphones className="h-3.5 w-3.5" />
              <span>پشتیبانی سفارش</span>
            </Link>
          </div>
        </article>
      </div>
    </div>
  )
}