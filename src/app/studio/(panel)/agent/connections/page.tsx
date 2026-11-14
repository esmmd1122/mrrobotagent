import Link from 'next/link'
import { getStudioSession } from '@/modules/salon/auth'
import { getProviderRows } from '@/modules/salon/ai/credentials'
import { getAgentRuntimeStatus } from '@/modules/salon/ai/agent-status'
import { saveAiProvider } from '@/app/studio/agent-actions'
import { ProviderTestButton } from '@/components/studio/ProviderTestButton'
import { redirect } from 'next/navigation'

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'مدل Gemini با فراخوانی ابزار برای رزرو و پاسخ‌گویی',
    credential: 'کلید API از Google AI Studio',
    envHint: 'GEMINI_API_KEY (فقط توسعه سراسری؛ ترجیحاً کلید اختصاصی سالن)',
    baseUrl: false,
  },
  {
    id: 'openai_compat',
    name: 'OpenAI-compatible',
    description: 'هر سرویس سازگار با Chat Completions (OpenAI، OpenRouter، …)',
    credential: 'کلید API و آدرس پایه',
    envHint: '—',
    baseUrl: true,
  },
] as const

function badge(ok: boolean | null, hasSecret: boolean) {
  if (!hasSecret) return { text: 'نیاز به پیکربندی', className: 'text-amber-300' }
  if (ok === true) return { text: 'متصل', className: 'text-emerald-300' }
  if (ok === false) return { text: 'خطا', className: 'text-red-300' }
  return { text: 'تست نشده', className: 'text-white/50' }
}

export default async function AgentConnectionsPage() {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  const [rows, runtime] = await Promise.all([
    getProviderRows(session.businessId),
    getAgentRuntimeStatus(session.businessId),
  ])
  const map = Object.fromEntries(rows.map((r) => [r.provider, r]))

  return (
    <section className="space-y-6" dir="rtl">
      <header>
        <h1 className="text-xl font-semibold">اتصال و مدیریت ایجنت‌ها</h1>
        <p className="mt-1 text-sm text-white/55">
          وضعیت ایجنت: {runtime.connection.message}
        </p>
        <Link href="/studio/agent" className="mt-2 inline-block text-sm text-[#e10600]">
          بازگشت به پیکربندی ایجنت
        </Link>
      </header>

      <ul className="space-y-4">
        {PROVIDERS.map((p) => {
          const row = map[p.id]
          const hasSecret = Boolean(row?.secretCiphertext)
          const b = badge(row?.lastTestOk ?? null, hasSecret)
          return (
            <li key={p.id} className="rounded-xl border border-white/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-medium">{p.name}</h2>
                  <p className="mt-1 text-sm text-white/60">{p.description}</p>
                </div>
                <span className={`text-sm ${b.className}`}>{b.text}</span>
              </div>
              <dl className="mt-3 grid gap-1 text-xs text-white/55">
                <div>
                  <dt className="inline">اعتبار لازم: </dt>
                  <dd className="inline">{p.credential}</dd>
                </div>
                <div>
                  <dt className="inline">متغیر محیط (سراسری): </dt>
                  <dd className="inline font-mono" dir="ltr">
                    {p.envHint}
                  </dd>
                </div>
                {row?.lastTestAt && (
                  <div>
                    <dt className="inline">آخرین تست: </dt>
                    <dd className="inline">{row.lastTestAt.toLocaleString('fa-IR')}</dd>
                  </div>
                )}
                {row?.lastError && (
                  <div className="text-red-300">
                    <dt className="inline">خطا: </dt>
                    <dd className="inline">{row.lastError.slice(0, 280)}</dd>
                  </div>
                )}
              </dl>

              <form action={saveAiProvider} className="mt-4 grid max-w-lg gap-2">
                <input type="hidden" name="provider" value={p.id} />
                <input
                  name="apiKey"
                  type="password"
                  placeholder={hasSecret ? 'کلید جدید (اختیاری)' : 'کلید API'}
                  className="rounded bg-white/5 px-3 py-2 font-mono text-sm"
                  dir="ltr"
                  autoComplete="off"
                />
                <input
                  name="model"
                  defaultValue={row?.model || ''}
                  placeholder={p.id === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini'}
                  className="rounded bg-white/5 px-3 py-2 font-mono text-sm"
                  dir="ltr"
                />
                {p.baseUrl && (
                  <input
                    name="baseUrl"
                    defaultValue={row?.baseUrl || 'https://api.openai.com/v1'}
                    placeholder="Base URL"
                    className="rounded bg-white/5 px-3 py-2 font-mono text-sm"
                    dir="ltr"
                  />
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="enabled" defaultChecked={row?.enabled} />
                  فعال
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="activeForAgent" defaultChecked={row?.activeForAgent} />
                  استفاده برای ایجنت این سالن
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="rounded bg-[#e10600] px-4 py-2 text-sm">
                    ذخیره
                  </button>
                </div>
              </form>
              <div className="mt-2">
                <ProviderTestButton provider={p.id} />
              </div>
              {!hasSecret && (
                <p className="mt-2 text-xs text-amber-200/90">
                  کلید API دریافت نشده است. از Google AI Studio کلید بگیرید و اینجا ذخیره کنید؛ بدون تست موفق، وضعیت «متصل» نمایش داده نمی‌شود.
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
