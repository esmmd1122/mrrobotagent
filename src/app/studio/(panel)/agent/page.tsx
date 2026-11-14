import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getStudioSession } from '@/modules/salon/auth'
import { getAgentRuntimeStatus } from '@/modules/salon/ai/agent-status'
import { saveAgentConfig, addAgentFaq, removeAgentFaq } from '@/app/studio/agent-actions'
import { redirect } from 'next/navigation'

function statusLabel(state: string) {
  if (state === 'connected') return 'متصل'
  if (state === 'configuration_required') return 'نیاز به پیکربندی'
  if (state === 'error') return 'خطا'
  return 'قطع'
}

export default async function AgentConfigPage() {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  const [config, faqs, usage, conversations, runtime] = await Promise.all([
    prisma.salonAgentConfig.upsert({
      where: { businessId: session.businessId },
      create: { businessId: session.businessId },
      update: {},
    }),
    prisma.salonAgentFaq.findMany({
      where: { businessId: session.businessId },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.salonAiUsage.aggregate({
      where: { businessId: session.businessId },
      _sum: { tokens: true },
      _count: true,
    }),
    prisma.salonAgentConversation.findMany({
      where: { businessId: session.businessId },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    getAgentRuntimeStatus(session.businessId),
  ])
  const allowed = JSON.parse(config.allowedActions) as Record<string, boolean>

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mr-kicker">AGENT CENTER</p>
          <h1 className="mt-2">پیکربندی ایجنت پذیرش</h1>
          <p className="mt-1 text-sm text-white/55">
            وضعیت: <strong>{statusLabel(runtime.connection.state)}</strong> — {runtime.connection.message}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/studio/agent/connections" className="rounded border border-white/15 px-3 py-1">
            اتصال و مدیریت ایجنت‌ها
          </Link>
          <Link href="/studio/agent/guide" className="rounded border border-white/15 px-3 py-1">
            راهنمای اتصال
          </Link>
        </div>
      </header>

      <form action={saveAgentConfig} className="grid max-w-2xl gap-3 rounded-xl border border-white/10 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={config.enabled} />
          فعال‌سازی ایجنت
        </label>
        <input name="displayName" defaultValue={config.displayName} placeholder="نام نمایشی" className="rounded bg-white/5 px-3 py-2" />
        <select name="language" defaultValue={config.language} className="rounded bg-zinc-900 px-3 py-2">
          <option value="fa">فارسی</option>
          <option value="en">English</option>
        </select>
        <select name="tone" defaultValue={config.tone} className="rounded bg-zinc-900 px-3 py-2">
          <option value="friendly">دوستانه</option>
          <option value="formal">رسمی</option>
          <option value="concise">مختصر</option>
        </select>
        <textarea name="welcomeMessage" defaultValue={config.welcomeMessage} placeholder="پیام خوش‌آمد" className="rounded bg-white/5 px-3 py-2" rows={2} />
        <textarea name="instructions" defaultValue={config.instructions} placeholder="دستورالعمل اختصاصی سالن" className="rounded bg-white/5 px-3 py-2" rows={3} />
        <textarea name="escalationRules" defaultValue={config.escalationRules} placeholder='قوانین ارجاع (JSON)' className="rounded bg-white/5 px-3 py-2 font-mono text-xs" dir="ltr" rows={2} />
        <fieldset className="grid gap-2 text-sm sm:grid-cols-2">
          <legend className="mb-1 text-white/60">عملیات مجاز</legend>
          {(
            [
              ['faq', 'سوالات متداول'],
              ['services', 'خدمات و قیمت'],
              ['slots', 'زمان‌های آزاد'],
              ['appointments', 'مشاهده نوبت‌ها'],
              ['book', 'رزرو'],
              ['reschedule', 'تغییر نوبت'],
              ['cancel', 'لغو'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex gap-2">
              <input type="checkbox" name={key} defaultChecked={allowed[key] !== false} />
              {label}
            </label>
          ))}
        </fieldset>
        <button className="w-fit rounded bg-[#e10600] px-4 py-2">ذخیره</button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">سوالات متداول</h2>
        <ul className="space-y-2 text-sm">
          {faqs.map((f) => (
            <li key={f.id} className="rounded border border-white/10 px-3 py-2">
              <p className="font-medium">{f.question}</p>
              <p className="text-white/70">{f.answer}</p>
              <form action={removeAgentFaq} className="mt-2">
                <input type="hidden" name="id" value={f.id} />
                <button className="text-xs text-red-400">حذف</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addAgentFaq} className="grid max-w-xl gap-2">
          <input name="question" required placeholder="سؤال" className="rounded bg-white/5 px-3 py-2" />
          <textarea name="answer" required placeholder="جواب" className="rounded bg-white/5 px-3 py-2" rows={2} />
          <button className="w-fit rounded border border-white/20 px-3 py-1 text-sm">افزودن FAQ</button>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-white/10 p-4 text-sm">
          <h2 className="font-medium">مصرف AI</h2>
          <p className="mt-2">تعداد پیام: {usage._count}</p>
          <p>توکن ثبت‌شده: {usage._sum.tokens || 0}</p>
        </article>
        <article className="rounded-xl border border-white/10 p-4 text-sm">
          <h2 className="font-medium">آخرین گفتگوها</h2>
          <ul className="mt-2 space-y-1 text-white/70">
            {conversations.map((c) => (
              <li key={c.id}>
                {c.channel} — {c.guestPhone || 'مهمان'} — {c.messages[0]?.content.slice(0, 48) || '…'}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </section>
  )
}
