import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Headphones,
  PackageSearch,
  Store,
} from 'lucide-react'
import { findOrderByCustomerAccess } from '@/modules/commerce/order-access'
import { formatStoreMoney } from '@/modules/commerce/pricing'
import { safeDecodeParam } from '@/modules/commerce/error-messages'
import { ORDER_STATUS_LABELS } from '@/lib/auth/constants'
import { getPaymentGatewayAvailability } from '@/modules/payment/registry'
import { paymentStatusLabelFa } from '@/modules/payment/labels'
import { CheckoutSteps } from '@/components/shop/CheckoutSteps'
import { StartPaymentButton } from '@/components/orders/StartPaymentButton'
import { CartSyncOnMount } from '@/components/cart/CartSyncOnMount'

type Props = {
  searchParams: Promise<{
    orderNumber?: string
    token?: string
    paymentMode?: string
    payError?: string
    payMsg?: string
  }>
}

export default async function OrderConfirmationPage({ searchParams }: Props) {
  const { orderNumber, token, paymentMode, payError, payMsg } = await searchParams
  if (!orderNumber || !token) {
    return (
      <div className="section-glow pt-28 pb-20">
        <div className="mx-auto max-w-lg px-4">
          <article className="space-y-4 rounded-2xl border border-white/12 bg-[#0d1018] p-6 text-center">
            <h1 className="text-xl font-black text-white">رسید ثبت سفارش</h1>
            <p className="text-sm leading-relaxed text-[#a8bad8]">
              لینک رسید سفارش ناقص است. برای مشاهده سفارش‌های خود وارد حساب کاربری شوید یا از لینک اختصاصی پس از ثبت سفارش استفاده کنید.
            </p>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
              <Link
                href="/account/orders"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#e10600] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#c80500]"
              >
                مشاهده سفارش‌های من
              </Link>
              <Link
                href="/shop"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-5 py-2 text-sm text-white/90 transition hover:bg-white/5"
              >
                بازگشت به فروشگاه
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

  const decodedPayMsg = safeDecodeParam(payMsg)
  const isUnpaid = order.paymentStatus !== 'PAID'
  const showGatewayError =
    Boolean(payError) && payError !== 'NO_GATEWAY' && paymentMode !== 'offline' && gateway.available
  const supportSubject = `هماهنگی پرداخت سفارش ${order.orderNumber}`
  const trackHref = `/orders/track?orderNumber=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(token)}`

  return (
    <div className="section-glow pt-28 pb-24">
      <CartSyncOnMount />
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <CheckoutSteps current="confirmation" />

        <article className="space-y-6 rounded-2xl border border-white/12 bg-[#0d1018] p-6 sm:p-8">
          <div className="text-center">
            <div
              className={`mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full border ${
                isUnpaid
                  ? 'border-amber-500/40 bg-amber-500/12 text-amber-300'
                  : 'border-emerald-500/40 bg-emerald-500/12 text-emerald-300'
              }`}
            >
              {isUnpaid ? <Clock className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
            </div>
            <p className="text-xs font-semibold text-[#ff5a56]">
              {isUnpaid ? 'سفارش ثبت شد — در انتظار پرداخت' : 'سفارش ثبت و پرداخت شد'}
            </p>
            <h1 className="mt-1.5 text-2xl font-black text-white">سفارش شما با موفقیت ثبت شد</h1>
            <p className="mt-2 text-xs text-[#a8bad8]">شماره پیگیری اختصاصی سفارش شما:</p>
            <p
              className="mt-1.5 inline-block rounded-xl border border-white/15 bg-[#121622] px-5 py-2 font-mono text-lg font-bold tracking-wide text-white tabular-nums"
              dir="ltr"
            >
              {order.orderNumber}
            </p>
          </div>

          <div className="grid gap-3 rounded-xl border border-white/10 bg-[#121622] p-4 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 sm:block">
              <span className="block text-xs text-[#a8bad8]">وضعیت سفارش</span>
              <p className="mt-0.5 font-bold text-white">
                {ORDER_STATUS_LABELS[order.status] || order.status}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <span className="block text-xs text-[#a8bad8]">وضعیت پرداخت</span>
              <p
                className={`mt-0.5 flex items-center gap-1.5 font-bold ${
                  isUnpaid ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {isUnpaid ? (
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{paymentStatusLabelFa(order.paymentStatus)}</span>
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3 sm:col-span-2">
              <span className="text-xs text-[#a8bad8]">مبلغ قابل پرداخت</span>
              <strong className="text-base font-black text-white tabular-nums">
                {formatStoreMoney(order.totalAmount, order.currency)}
              </strong>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-white/10 pt-4 text-sm">
            <h2 className="font-bold text-white">اقلام سفارش</h2>
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-white">
                      {item.productName}
                      {item.planTitle ? ` — ${item.planTitle}` : ''}
                    </p>
                    <p className="text-xs text-[#a8bad8] tabular-nums">
                      تعداد: {item.quantity.toLocaleString('fa-IR')}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-white tabular-nums">
                    {formatStoreMoney(item.lineTotal, order.currency)}
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
          </div>

          {showGatewayError ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p>
                انتقال خودکار به درگاه پرداخت انجام نشد
                {decodedPayMsg ? ` (${decodedPayMsg})` : ''}. سفارش شما ثبت شده و می‌توانید دوباره تلاش کنید.
              </p>
            </div>
          ) : null}

          {isUnpaid && !gateway.available ? (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
              <p className="flex items-center gap-2 font-bold text-amber-200">
                <Clock className="h-4 w-4 shrink-0" />
                <span>پرداخت آنلاین در حال حاضر غیرفعال است</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
                سفارش شما با وضعیت «در انتظار پرداخت» در سیستم ذخیره شده است و هنوز پرداختی انجام نشده است.
                برای هماهنگی پرداخت و فعال‌سازی سرویس، با پشتیبانی MR.ROBOT در ارتباط باشید و شماره سفارش{' '}
                <span dir="ltr" className="font-mono font-semibold text-white">
                  {order.orderNumber}
                </span>{' '}
                را اعلام کنید.
              </p>
              <Link
                href={`/contact?subject=${encodeURIComponent(supportSubject)}`}
                className="mt-3.5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#c80500]"
              >
                <Headphones className="h-4 w-4" />
                <span>تماس با پشتیبانی برای هماهنگی پرداخت</span>
              </Link>
            </div>
          ) : null}

          {isUnpaid && gateway.available ? (
            <StartPaymentButton orderNumber={order.orderNumber} viewToken={token} />
          ) : null}

          <div className="flex flex-col gap-2.5 border-t border-white/10 pt-4 text-center sm:flex-row sm:justify-between">
            <Link
              href={trackHref}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/[0.08]"
            >
              <PackageSearch className="h-4 w-4 text-[#38bdf8]" />
              <span>مشاهده صفحه پیگیری سفارش</span>
            </Link>
            <Link
              href="/shop"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/12 px-4 py-2 text-sm text-[#a8bad8] transition hover:bg-white/5 hover:text-white"
            >
              <Store className="h-4 w-4" />
              <span>بازگشت به فروشگاه</span>
            </Link>
          </div>

          <p className="text-center text-xs leading-relaxed text-[#7c92b8]">
            لطفاً شماره پیگیری یا لینک این صفحه را نزد خود نگه دارید؛ برای مشاهده وضعیت سفارش مهمان به لینک اختصاصی نیاز است.
          </p>
        </article>
      </div>
    </div>
  )
}