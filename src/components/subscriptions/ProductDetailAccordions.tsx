import Link from 'next/link'
import { ChevronDown, Headphones, HelpCircle, PackageCheck, ShieldCheck } from 'lucide-react'
import type { ProductFaqItem } from '@/modules/commerce/storefront-presenters'

type PlanInstruction = {
  planTitle: string
  instructions: string
}

type Props = {
  productName: string
  categoryName?: string | null
  details: string[]
  features: string[]
  planInstructions: PlanInstruction[]
  faqs: ProductFaqItem[]
  supportHours?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
}

export function ProductDetailAccordions({
  productName,
  categoryName,
  details,
  features,
  planInstructions,
  faqs,
  supportHours,
  contactPhone,
  contactEmail,
}: Props) {
  return (
    <div className="space-y-4">
      {/* 1. Expandable Details & Delivery/Activation Guide */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1018]">
        <details open className="group border-b border-white/10">
          <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-extrabold text-white transition hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2.5">
              <PackageCheck className="h-4 w-4 text-[#e10600]" />
              <span>چه چیزی دریافت می‌کنید؟ نحوه تحویل و فعال‌سازی</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/55 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="space-y-4 px-5 pb-5 text-sm leading-relaxed text-[#a8bad8]">
            <p>
              محصول <strong className="text-white">{productName}</strong> یک سرویس دیجیتال
              {categoryName ? ` در دسته‌بندی «${categoryName}»` : ''} است. پس از ثبت سفارش و تأیید پرداخت، اطلاعات تحویل، راهنمای فعال‌سازی یا فایل‌های اختصاصی شما در{' '}
              <Link href="/account/orders" className="text-white underline decoration-white/35 hover:text-[#ff4d48]">
                سفارش‌های حساب کاربری
              </Link>{' '}
              و صفحه{' '}
              <Link href="/orders/track" className="text-white underline decoration-white/35 hover:text-[#ff4d48]">
                پیگیری سفارش
              </Link>{' '}
              ثبت و نمایش داده می‌شوند.
            </p>

            {planInstructions.length > 0 ? (
              <div className="space-y-2.5 rounded-xl border border-white/10 bg-[#121622] p-4">
                <p className="text-xs font-bold text-white">توضیحات تحویل و فعال‌سازی طرح‌ها:</p>
                <ul className="space-y-2 text-xs leading-relaxed text-white/85">
                  {planInstructions.map((item, idx) => (
                    <li key={`pi-${idx}`} className="border-t border-white/8 pt-2 first:border-t-0 first:pt-0">
                      <span className="font-bold text-[#38bdf8]">{item.planTitle}: </span>
                      <span className="whitespace-pre-wrap">{item.instructions}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(details.length > 0 || features.length > 0) ? (
              <div className="grid gap-4 pt-1 sm:grid-cols-2">
                {details.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-bold text-white">مشخصات ثبت‌شده سرویس</p>
                    <ul className="space-y-1.5 text-xs text-white/80">
                      {details.map((item, idx) => (
                        <li key={`acc-det-${idx}`} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#38bdf8]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {features.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-bold text-white">ویژگی‌های همراه سفارش</p>
                    <ul className="space-y-1.5 text-xs text-white/80">
                      {features.map((item, idx) => (
                        <li key={`acc-feat-${idx}`} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e10600]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </details>

        {/* 2. Support & Order Tracking Conditions (Real business info only) */}
        <details className="group border-b border-white/10">
          <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-extrabold text-white transition hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2.5">
              <Headphones className="h-4 w-4 text-[#38bdf8]" />
              <span>پشتیبانی، پیگیری سفارش و راه‌های ارتباط با MR.ROBOT</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/55 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-[#a8bad8]">
            <p>
              هر سفارش پس از ثبت، شماره پیگیری اختصاصی دریافت می‌کند. در تمام مراحل پیش از خرید یا هنگام فعال‌سازی می‌توانید از طریق فرم{' '}
              <Link
                href={`/contact?subject=${encodeURIComponent(`پشتیبانی ${productName}`)}`}
                className="font-semibold text-white underline decoration-white/35 hover:text-[#ff4d48]"
              >
                تماس و ثبت تیکت پشتیبانی
              </Link>{' '}
              با تیم MR.ROBOT در ارتباط باشید.
            </p>
            {(supportHours || contactPhone || contactEmail) ? (
              <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-white/10 bg-[#121622] px-4 py-3 text-xs text-white/85">
                {supportHours ? (
                  <span>
                    <strong className="text-white">ساعات پاسخ‌گویی:</strong> {supportHours}
                  </span>
                ) : null}
                {contactPhone ? (
                  <span dir="ltr">
                    <strong className="text-white" dir="rtl">تلفن: </strong>
                    {contactPhone}
                  </span>
                ) : null}
                {contactEmail ? (
                  <span dir="ltr">
                    <strong className="text-white" dir="rtl">ایمیل: </strong>
                    {contactEmail}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </details>

        {/* 3. Buyer Security & Transparency */}
        <details className="group">
          <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-extrabold text-white transition hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>شفافیت قیمت‌گذاری و وضعیت پرداخت</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/55 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 text-sm leading-relaxed text-[#a8bad8]">
            قیمت تمام طرح‌ها، تخفیف‌ها و جمع کل سبد خرید به‌صورت مستقیم در سرور محاسبه و اعتبارسنجی می‌شود. هر سفارش ابتدا با وضعیت شفاف «در انتظار پرداخت» ثبت شده و کد پیگیری اختصاصی صادر می‌گردد تا هیچ ابهامی در مراحل پرداخت و تحویل وجود نداشته باشد.
          </div>
        </details>
      </section>

      {/* 4. Frequently Asked Questions (Expandable) */}
      {faqs.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1018]">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
            <HelpCircle className="h-4 w-4 text-[#e10600]" />
            <h2 className="text-sm font-extrabold text-white">پرسش‌های متداول خریداران</h2>
          </div>
          <div className="divide-y divide-white/10">
            {faqs.map((faq) => (
              <details key={faq.id} className="group">
                <summary className="flex min-h-[50px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-semibold text-white/95 transition hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                  <span>{faq.question}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/50 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-4 text-xs leading-relaxed text-[#a8bad8] sm:text-sm">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
