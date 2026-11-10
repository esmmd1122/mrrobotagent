import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-mr-border bg-mr-charcoal">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <p className="text-lg font-bold" dir="ltr">
            MR.ROBOT
          </p>
          <p className="mt-3 text-sm text-mr-muted leading-relaxed">
            پلتفرم خدمات دیجیتال پریمیوم؛ اشتراک‌های حرفه‌ای و راهکارهای هوش مصنوعی
            برای زندگی و کسب‌وکار.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">مسیرهای سریع</p>
          <ul className="mt-4 space-y-2 text-sm text-mr-muted">
            <li>
              <Link href="/#subscriptions" className="hover:text-white">
                اشتراک‌های دیجیتال
              </Link>
            </li>
            <li>
              <Link href="/#ai" className="hover:text-white">
                MR.ROBOT AI
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">
                تماس و درخواست
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">آینده پلتفرم</p>
          <p className="mt-4 text-sm text-mr-muted leading-relaxed">
            حساب کاربری، پرداخت آنلاین، پیگیری سفارش و پنل مدیریت به‌زودی به
            معماری فعلی افزوده می‌شوند.
          </p>
        </div>
      </div>
      <div className="border-t border-mr-border py-6 text-center text-xs text-mr-muted">
        © {new Date().getFullYear()} MR.ROBOT — تمامی حقوق محفوظ است.
      </div>
    </footer>
  )
}
