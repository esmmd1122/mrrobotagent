export function StartPaymentViaAccountNote({ orderNumber }: { orderNumber: string }) {
  return (
    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
      برای پرداخت امن، از لینک تأیید سفارش (شامل شماره{' '}
      <span dir="ltr" className="font-mono text-white/90">
        {orderNumber}
      </span>
      ) و توکن یک‌بارمصرف که پس از ثبت سفارش در اختیار شماست استفاده کنید. بدون توکن، صفحه پیگیری قابل نمایش نیست.
    </p>
  )
}