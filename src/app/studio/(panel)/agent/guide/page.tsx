import Link from 'next/link'
import { getStudioSession } from '@/modules/salon/auth'
import { getAgentRuntimeStatus } from '@/modules/salon/ai/agent-status'
import { resolveAgentProvider } from '@/modules/salon/ai/credentials'
import { redirect } from 'next/navigation'

export default async function AgentGuidePage() {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  const [runtime, resolved] = await Promise.all([
    getAgentRuntimeStatus(session.businessId),
    resolveAgentProvider(session.businessId),
  ])

  return (
    <section className="prose prose-invert max-w-3xl space-y-6 text-sm leading-relaxed" dir="rtl">
      <header>
        <h1 className="text-xl font-semibold text-white">راهنمای اتصال ایجنت‌ها</h1>
        <p className="text-white/60">
          ارائه‌دهنده فعال: {resolved.providerId} — وضعیت: {runtime.connection.state}
        </p>
        <Link href="/studio/agent/connections" className="text-[#e10600]">
          رفتن به اتصال ایجنت‌ها
        </Link>
      </header>

      <article className="space-y-4 text-white/85">
        <h2 className="text-lg text-white">۱. ارائه‌دهندگان پشتیبانی‌شده</h2>
        <ul className="list-disc pr-5">
          <li>Google Gemini (`gemini`)</li>
          <li>OpenAI-compatible (`openai_compat`) — OpenAI، OpenRouter و مشابه</li>
          <li>موتور قوانین (`rules`) — فقط وقتی AI متصل نیست</li>
        </ul>

        <h2 className="text-lg text-white">۲. دریافت کلید Gemini</h2>
        <ol className="list-decimal pr-5">
          <li>وارد <a href="https://aistudio.google.com/apikey" className="text-[#e10600]">Google AI Studio</a> شوید.</li>
          <li>یک API key بسازید.</li>
          <li>در «اتصال ایجنت‌ها» کلید را وارد و ذخیره کنید.</li>
          <li>دکمه «تست اتصال» را بزنید؛ تا تست موفق نشود وضعیت «متصل» نشان داده نمی‌شود.</li>
        </ol>

        <h2 className="text-lg text-white">۳. متغیرهای محیط سرور (نام واقعی)</h2>
        <ul className="list-disc pr-5 font-mono text-xs" dir="ltr">
          <li>AUTH_SECRET — رمزنگاری کلیدهای هر سالن (حداقل ۳۲ کاراکتر)</li>
          <li>GEMINI_API_KEY — اختیاری فقط در NODE_ENV=development برای توسعه محلی</li>
          <li>DATABASE_URL — پایگاه داده</li>
        </ul>
        <p>کلید هر سالن در جدول رمزنگاری‌شده ذخیره می‌شود؛ هرگز در پاسخ API یا مرورگر برنمی‌گردد.</p>

        <h2 className="text-lg text-white">۴. عیب‌یابی</h2>
        <ul className="list-disc pr-5">
          <li>خطای ۴۰۳/۴۰۱ Gemini: کلید نامعتبر یا billing فعال نیست.</li>
          <li>ایجنت غیرفعال: در پیکربندی ایجنت تیک «فعال‌سازی» را بزنید.</li>
          <li>رزرو از چت: مشتری باید OTP را تایید کند؛ سپس ایجنت prepare و confirm را اجرا می‌کند.</li>
        </ul>

        <h2 className="text-lg text-white">۵. هنوز پیاده‌سازی نشده</h2>
        <ul className="list-disc pr-5">
          <li>تماس صوتی WebRTC و تلفن</li>
          <li>تلگرام مینی‌اپ</li>
          <li>پرداخت آنلاین داخل چت</li>
        </ul>

        <h2 className="text-lg text-white">۶. افزودن ارائه‌دهنده جدید (توسعه‌دهنده)</h2>
        <p>
          فایل راهنما: <span className="font-mono text-xs" dir="ltr">docs/salon-agent-integrations.md</span>
        </p>
      </article>
    </section>
  )
}
