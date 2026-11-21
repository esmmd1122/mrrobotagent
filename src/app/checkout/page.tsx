import Link from 'next/link'
import { randomUUID } from 'crypto'
import { ArrowRight, Headphones, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/db'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { getActiveWebsiteConfig } from '@/lib/site-config/service'
import { readCart } from '@/modules/commerce/cart-cookie'
import { formatStoreMoney, validateCheckoutPricing } from '@/modules/commerce/pricing'
import { computeCartSavings } from '@/modules/commerce/storefront-presenters'
import { resolveStorefrontErrorMessage } from '@/modules/commerce/error-messages'
import { getPaymentGatewayAvailability } from '@/modules/payment/registry'
import { CheckoutSteps } from '@/components/shop/CheckoutSteps'
import { ProductLogo } from '@/components/ui/ProductLogo'
import { CheckoutForm } from './CheckoutForm'

type Props = { searchParams: Promise<{ error?: string }> }

export default async function CheckoutPage({ searchParams }: Props) {
  const lines = await readCart()
  const rawError = (await searchParams).error
  const errorMessage = resolveStorefrontErrorMessage(rawError)

  const checkout = await validateCheckoutPricing(lines)
  if (!checkout.ok) {
    return (
      <div className="section-glow pt-28 pb-20 text-center">
        <div className="mx-auto max-w-md px-4">
          <div className="card-shop space-y-4 p-8">
            <p className="text-sm text-[#a8bad8]">{checkout.error}</p>
            <Link
              href="/cart"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#e10600] px-5 py-2 text-sm font-bold text-white"
            >
              بازگشت به سبد خرید
            </Link>
          </div>
        </div>
      </div>
    )
  }
  const pricing = checkout.pricing

  if (pricing.lines.length === 0) {
    return (
      <div className="section-glow pt-28 pb-20 text-center">
        <div className="mx-auto max-w-md px-4">
          <div className="card-shop space-y-4 p-8">
            <p className="text-sm text-[#a8bad8]">سبد خرید شما در حال حاضر خالی است.</p>
            <Link
              href="/shop"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#e10600] px-5 py-2 text-sm font-bold text-white"
            >
              مشاهده فروشگاه
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const [session, gateway, site] = await Promise.all([
    getCustomerSession(),
    getPaymentGatewayAvailability(),
    getActiveWebsiteConfig(),
  ])

  const customer = session
    ? await prisma.customer.findUnique({
        where: { id: session.sub },
        select: { name: true, email: true, phone: true },
      })
    : null

  const idempotencyKey = randomUUID()
  const catalogSavings = computeCartSavings(pricing.lines)
  const supportHours = site.footer.supportHours?.trim()

  return (
    <div className="section-glow pt-28 pb-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <CheckoutSteps current="checkout" />

        <div className="mb-4">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a8bad8] transition hover:text-white"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>بازگشت و ویرایش سبد خرید</span>
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 lg:col-span-7">
            <p className="text-xs font-semibold text-[#ff5a56]">مرحله ۲ از ۳</p>
            <h1 className="mt-1 text-3xl font-black text-white">تسویه‌حساب و ثبت سفارش</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#a8bad8]">
              {gateway.available
                ? 'اطلاعات تماس خود را وارد کنید تا سفارش با وضعیت «در انتظار پرداخت» ثبت شود و به درگاه پرداخت هدایت شوید.'
                : 'اطلاعات تماس خود را وارد کنید تا سفارش شما با وضعیت «در انتظار پرداخت» ثبت شود و کد پیگیری اختصاصی دریافت کنید.'}
            </p>
            {errorMessage ? (
              <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </p>
            ) : null}
            <CheckoutForm
              idempotencyKey={idempotencyKey}
              defaultName={customer?.name}
              defaultEmail={customer?.email ?? undefined}
              defaultPhone={customer?.phone ?? undefined}
              onlinePaymentAvailable={gateway.available}
              subtotal={pricing.subtotal}
              currency={pricing.currency}
            />
          </div>

          <aside className="space-y-4 rounded-2xl border border-white/12 bg-[#0d1018] p-6 lg:sticky lg:top-28 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-extrabold text-white">خلاصه سفارش</h2>
              <span className="text-xs text-[#a8bad8] tabular-nums">
                {pricing.lines.reduce((s, l) => s + l.quantity, 0).toLocaleString('fa-IR')} مورد
              </span>
            </div>

            <ul className="space-y-3 text-sm">
              {pricing.lines.map((l) => (
                <li
                  key={`${l.productId}:${l.planId ?? ''}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#121622]">
                      {l.imageUrl ? (
                        <img
                          src={l.imageUrl}
                          alt={l.productName}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ProductLogo
                          slug={
                            l.slug as
                              | 'chatgpt-plus'
                              | 'capcut-pro'
                              | 'grok'
                              | 'gemini-pro'
                          }
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{l.productName}</p>
                      {l.planTitle ? (
                        <p className="truncate text-xs text-[#38bdf8]">{l.planTitle}</p>
                      ) : null}
                      <p className="text-xs text-[#a8bad8] tabular-nums">
                        {formatStoreMoney(l.unitPrice, pricing.currency)} ×{' '}
                        {l.quantity.toLocaleString('fa-IR')}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-bold text-white tabular-nums">
                    {formatStoreMoney(l.lineTotal, pricing.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <hr className="border-white/10" />

            <div className="space-y-2 text-sm">
              <p className="flex justify-between gap-2">
                <span className="text-[#a8bad8]">جمع کل کالاها</span>
                <span className="font-semibold text-white tabular-nums">
                  {formatStoreMoney(pricing.subtotal, pricing.currency)}
                </span>
              </p>
              {catalogSavings > 0 ? (
                <p className="flex justify-between gap-2 text-xs text-emerald-300">
                  <span>سود شما از تخفیف محصولات</span>
                  <span className="font-semibold tabular-nums">
                    {formatStoreMoney(catalogSavings, pricing.currency)}
                  </span>
                </p>
              ) : null}
              <p className="flex justify-between gap-2 border-t border-white/10 pt-3 text-lg font-black text-white">
                <span>مبلغ قابل پرداخت</span>
                <span className="tabular-nums">
                  {formatStoreMoney(pricing.total, pricing.currency)}
                </span>
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-white/10 bg-[#121622] p-3.5 text-xs leading-relaxed text-[#a8bad8]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#38bdf8]" />
                <span>
                  محاسبه نهایی قیمت و تخفیف در سرور انجام می‌شود و پس از ثبت، کد پیگیری اختصاصی دریافت می‌کنید.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  در صورت نیاز به راهنمایی:{' '}
                  <Link href="/contact" className="text-white underline decoration-white/30 hover:text-[#ff4d48]">
                    پشتیبانی MR.ROBOT
                  </Link>
                  {supportHours ? ` (${supportHours})` : ''}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}