'use client'

import { useMemo, useState } from 'react'
import type { WebsiteConfig } from '@/lib/site-config/types'
import {
  publishWebsiteAction,
  restoreRevisionAction,
  saveWebsiteDraftAction,
  upsertSitePageAction,
} from '@/app/admin/(protected)/appearance/actions'

type Media = {
  id: string
  url: string
  filename: string
  sizeBytes: number
}

type SitePageRow = {
  id: string
  slug: string
  title: string
  status: string
  metaTitle: string | null
}

type Revision = {
  id: string
  label: string | null
  createdAt: string
}

type Props = {
  initialDraft: WebsiteConfig
  publishedAt: string | null
  media: Media[]
  pages: SitePageRow[]
  revisions: Revision[]
}

const tabs = [
  'homepage',
  'theme',
  'navigation',
  'footer',
  'sections',
  'pages',
  'media',
  'history',
] as const

export function WebsiteEditor({
  initialDraft,
  publishedAt,
  media,
  pages,
  revisions,
}: Props) {
  const [config, setConfig] = useState<WebsiteConfig>(initialDraft)
  const [tab, setTab] = useState<(typeof tabs)[number]>('homepage')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [publishConfirm, setPublishConfirm] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const configJson = useMemo(() => JSON.stringify(config), [config])

  async function saveDraft() {
    setBusy(true)
    setMessage('')
    try {
      await saveWebsiteDraftAction(configJson)
      setMessage('پیش‌نویس ذخیره شد (هنوز منتشر نشده).')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'خطا در ذخیره')
    }
    setBusy(false)
  }

  async function publish() {
    if (publishConfirm !== 'PUBLISH') {
      setMessage('برای انتشار عبارت PUBLISH را وارد کنید.')
      return
    }
    setBusy(true)
    try {
      await saveWebsiteDraftAction(configJson)
      await publishWebsiteAction('PUBLISH')
      setMessage('تغییرات با موفقیت منتشر شد.')
      setPublishConfirm('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'خطا در انتشار')
    }
    setBusy(false)
  }

  async function startPreview(device: 'desktop' | 'mobile') {
    await fetch('/api/admin/appearance/preview', { method: 'POST' })
    const w = device === 'mobile' ? 390 : 1200
    setPreviewUrl(`/?_preview=1#home`)
    setMessage(`پیش‌نمایش ${device === 'mobile' ? 'موبایل' : 'دسکتاپ'} — iframe زیر (پیش‌نویس). عرض: ${w}px`)
  }

  async function endPreview() {
    await fetch('/api/admin/appearance/preview', { method: 'DELETE' })
    setPreviewUrl(null)
  }

  function patchHero<K extends keyof WebsiteConfig['hero']>(key: K, value: WebsiteConfig['hero'][K]) {
    setConfig((c) => ({ ...c, hero: { ...c.hero, [key]: value } }))
  }

  function patchTheme<K extends keyof WebsiteConfig['theme']>(key: K, value: WebsiteConfig['theme'][K]) {
    setConfig((c) => ({ ...c, theme: { ...c.theme, [key]: value } }))
  }

  return (
    <div className="space-y-4">
      <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="text-xl font-bold">ویرایشگر ظاهر سایت</h1>
          <p className="text-xs text-white/50">
            آخرین انتشار:{' '}
            {publishedAt ? new Date(publishedAt).toLocaleString('fa-IR') : 'هنوز منتشر نشده'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => startPreview('desktop')} className="btn-secondary">
            پیش‌نمایش دسکتاپ
          </button>
          <button type="button" onClick={() => startPreview('mobile')} className="btn-secondary">
            پیش‌نمایش موبایل
          </button>
          <button type="button" onClick={endPreview} className="btn-secondary">
            پایان پیش‌نمایش
          </button>
          <button type="button" disabled={busy} onClick={saveDraft} className="btn-primary">
            ذخیره پیش‌نویس
          </button>
        </div>
      </div>

      {message ? <p className="rounded-lg border border-mr-border bg-mr-surface px-4 py-2 text-sm">{message}</p> : null}

      <div className="admin-card flex flex-wrap gap-2 p-3">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs ${tab === t ? 'bg-mr-red/20 text-white' : 'text-white/60'}`}
          >
            {tabLabel(t)}
          </button>
        ))}
      </div>

      <TabPanel>
        {tab === 'homepage' && (
          <HomeTab config={config} patchHero={patchHero} media={media} />
        )}
        {tab === 'theme' && <ThemeTab config={config} patchTheme={patchTheme} />}
        {tab === 'navigation' && (
          <NavTab
            config={config}
            onHeader={(header) => setConfig((c) => ({ ...c, navigation: { ...c.navigation, header } }))}
            onCta={(purchaseCta) => setConfig((c) => ({ ...c, navigation: { ...c.navigation, purchaseCta } }))}
          />
        )}
        {tab === 'footer' && (
          <FooterTab
            config={config}
            onChange={(footer) => setConfig((c) => ({ ...c, footer }))}
            onQuickLinks={(footerQuickLinks) =>
              setConfig((c) => ({ ...c, navigation: { ...c.navigation, footerQuickLinks } }))
            }
          />
        )}
        {tab === 'sections' && (
          <SectionsTab
            sections={config.sections}
            onChange={(sections) => setConfig((c) => ({ ...c, sections }))}
          />
        )}
        {tab === 'pages' && <PagesTab pages={pages} media={media} />}
        {tab === 'media' && <MediaTab media={media} onPick={(url) => patchHero('characterImageUrl', url)} />}
        {tab === 'history' && (
          <HistoryTab
            revisions={revisions}
            onRestore={async (id) => {
              await restoreRevisionAction(id)
              setMessage('نسخه به پیش‌نویس بازگردانی شد — برای اعمال در سایت، انتشار دهید.')
            }}
          />
        )}
      </TabPanel>

      <div className="admin-card space-y-3 p-4">
        <p className="text-sm font-semibold text-red-300">انتشار در سایت عمومی</p>
        <p className="text-xs text-white/50">
          تا زمانی که «انتشار» را با تأیید انجام ندهید، بازدیدکنندگان نسخه منتشرشده قبلی را می‌بینند.
        </p>
        <input
          className="admin-input max-w-xs"
          placeholder='تایپ کنید: PUBLISH'
          value={publishConfirm}
          onChange={(e) => setPublishConfirm(e.target.value)}
        />
        <button type="button" disabled={busy} onClick={publish} className="btn-primary block">
          انتشار تغییرات
        </button>
      </div>

      {previewUrl ? (
        <div className="admin-card overflow-hidden p-2">
          <iframe title="پیش‌نمایش" src={previewUrl} className="h-[70vh] w-full rounded-lg border border-mr-border bg-black" />
        </div>
      ) : null}

      <style jsx global>{`
        .btn-primary {
          border-radius: 10px;
          background: #e10600;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .btn-secondary {
          border-radius: 10px;
          border: 1px solid #2a2b35;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}

function tabLabel(t: (typeof tabs)[number]) {
  const map: Record<(typeof tabs)[number], string> = {
    homepage: 'صفحه اصلی',
    theme: 'تم',
    navigation: 'منو',
    footer: 'فوتر',
    sections: 'بخش‌ها',
    pages: 'صفحات',
    media: 'رسانه',
    history: 'نسخه‌ها',
  }
  return map[t]
}

function TabPanel({ children }: { children: React.ReactNode }) {
  return <div className="admin-card p-4">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-white/75">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

function HomeTab({
  config,
  patchHero,
  media,
}: {
  config: WebsiteConfig
  patchHero: (k: keyof WebsiteConfig['hero'], v: WebsiteConfig['hero'][typeof k]) => void
  media: Media[]
}) {
  const h = config.hero
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="شعار">
        <input className="admin-input" value={h.slogan} onChange={(e) => patchHero('slogan', e.target.value)} />
      </Field>
      <Field label="زیرعنوان">
        <input className="admin-input" value={h.subtitle} onChange={(e) => patchHero('subtitle', e.target.value)} />
      </Field>
      <Field label="توضیح (اختیاری)">
        <textarea className="admin-input" value={h.description || ''} onChange={(e) => patchHero('description', e.target.value)} />
      </Field>
      <Field label="برچسب برند">
        <input className="admin-input" value={h.brandLabel} onChange={(e) => patchHero('brandLabel', e.target.value)} />
      </Field>
      <Field label="دکمه اصلی — متن">
        <input className="admin-input" value={h.ctaPrimary.label} onChange={(e) => patchHero('ctaPrimary', { ...h.ctaPrimary, label: e.target.value })} />
      </Field>
      <Field label="دکمه اصلی — لینک">
        <input className="admin-input" value={h.ctaPrimary.href} onChange={(e) => patchHero('ctaPrimary', { ...h.ctaPrimary, href: e.target.value })} />
      </Field>
      <Field label="دکمه ثانویه — متن">
        <input className="admin-input" value={h.ctaSecondary.label} onChange={(e) => patchHero('ctaSecondary', { ...h.ctaSecondary, label: e.target.value })} />
      </Field>
      <Field label="دکمه ثانویه — لینک">
        <input className="admin-input" value={h.ctaSecondary.href} onChange={(e) => patchHero('ctaSecondary', { ...h.ctaSecondary, href: e.target.value })} />
      </Field>
      <Field label="تصویر شخصیت (URL)">
        <input className="admin-input" value={h.characterImageUrl} onChange={(e) => patchHero('characterImageUrl', e.target.value)} />
        <select className="admin-input mt-2" onChange={(e) => e.target.value && patchHero('characterImageUrl', e.target.value)}>
          <option value="">انتخاب از رسانه…</option>
          {media.map((m) => (
            <option key={m.id} value={m.url}>
              {m.filename}
            </option>
          ))}
        </select>
      </Field>
      <Field label="پس‌زمینه سینمایی (URL)">
        <input className="admin-input" value={h.cinematicBgUrl} onChange={(e) => patchHero('cinematicBgUrl', e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" checked={h.enabled} onChange={(e) => patchHero('enabled', e.target.checked)} />
        نمایش هیرو
      </label>
    </div>
  )
}

function ThemeTab({
  config,
  patchTheme,
}: {
  config: WebsiteConfig
  patchTheme: (k: keyof WebsiteConfig['theme'], v: WebsiteConfig['theme'][typeof k]) => void
}) {
  const t = config.theme
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="حالت">
        <select className="admin-input" value={t.mode} onChange={(e) => patchTheme('mode', e.target.value as 'dark' | 'light')}>
          <option value="dark">تیره (پیش‌فرض برند)</option>
          <option value="light">روشن</option>
        </select>
      </Field>
      <Field label="رنگ اصلی">
        <input type="color" className="h-10 w-full" value={t.primaryColor} onChange={(e) => patchTheme('primaryColor', e.target.value)} />
      </Field>
      <Field label="رنگ ثانویه">
        <input type="color" className="h-10 w-full" value={t.secondaryColor} onChange={(e) => patchTheme('secondaryColor', e.target.value)} />
      </Field>
      <Field label="پس‌زمینه">
        <input type="color" className="h-10 w-full" value={t.backgroundColor} onChange={(e) => patchTheme('backgroundColor', e.target.value)} />
      </Field>
      <Field label="مقیاس فونت">
        <input type="range" min={0.85} max={1.25} step={0.01} value={t.fontScale} onChange={(e) => patchTheme('fontScale', Number(e.target.value))} />
      </Field>
      <Field label="گوشه دکمه (px)">
        <input type="number" className="admin-input" value={t.buttonRadius} onChange={(e) => patchTheme('buttonRadius', Number(e.target.value))} />
      </Field>
    </div>
  )
}

function NavTab({
  config,
  onHeader,
  onCta,
}: {
  config: WebsiteConfig
  onHeader: (header: WebsiteConfig['navigation']['header']) => void
  onCta: (cta: WebsiteConfig['navigation']['purchaseCta']) => void
}) {
  return (
    <div className="space-y-3">
      {config.navigation.header.map((link, i) => (
        <div key={link.id} className="grid gap-2 rounded-lg border border-mr-border p-3 md:grid-cols-4">
          <input
            className="admin-input"
            value={link.label}
            onChange={(e) => {
              const next = [...config.navigation.header]
              next[i] = { ...link, label: e.target.value }
              onHeader(next)
            }}
          />
          <input
            className="admin-input"
            value={link.href}
            onChange={(e) => {
              const next = [...config.navigation.header]
              next[i] = { ...link, href: e.target.value }
              onHeader(next)
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={link.enabled}
              onChange={(e) => {
                const next = [...config.navigation.header]
                next[i] = { ...link, enabled: e.target.checked }
                onHeader(next)
              }}
            />
            فعال
          </label>
        </div>
      ))}
      <Field label="CTA هدر — متن">
        <input
          className="admin-input"
          value={config.navigation.purchaseCta.label}
          onChange={(e) => onCta({ ...config.navigation.purchaseCta, label: e.target.value })}
        />
      </Field>
      <Field label="CTA هدر — لینک">
        <input
          className="admin-input"
          value={config.navigation.purchaseCta.href}
          onChange={(e) => onCta({ ...config.navigation.purchaseCta, href: e.target.value })}
        />
      </Field>
    </div>
  )
}

function FooterTab({
  config,
  onChange,
  onQuickLinks,
}: {
  config: WebsiteConfig
  onChange: (f: WebsiteConfig['footer']) => void
  onQuickLinks: (links: WebsiteConfig['navigation']['footerQuickLinks']) => void
}) {
  const f = config.footer
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="توضیح فوتر">
        <textarea className="admin-input" value={f.tagline} onChange={(e) => onChange({ ...f, tagline: e.target.value })} />
      </Field>
      <Field label="تلگرام">
        <input className="admin-input" value={f.social.telegram || ''} onChange={(e) => onChange({ ...f, social: { ...f.social, telegram: e.target.value } })} />
      </Field>
      <Field label="اینستاگرام">
        <input className="admin-input" value={f.social.instagram || ''} onChange={(e) => onChange({ ...f, social: { ...f.social, instagram: e.target.value } })} />
      </Field>
      {config.navigation.footerQuickLinks.map((link, i) => (
        <Field key={link.id} label={`لینک فوتر ${i + 1}`}>
          <input
            className="admin-input"
            value={link.label}
            onChange={(e) => {
              const next = [...config.navigation.footerQuickLinks]
              next[i] = { ...link, label: e.target.value }
              onQuickLinks(next)
            }}
          />
        </Field>
      ))}
    </div>
  )
}

function SectionsTab({
  sections,
  onChange,
}: {
  sections: WebsiteConfig['sections']
  onChange: (s: WebsiteConfig['sections']) => void
}) {
  return (
    <div className="space-y-3">
      {sections.map((s, i) => (
        <div key={s.id} className="rounded-lg border border-mr-border p-3">
          <p className="text-sm font-semibold">{s.id}</p>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => {
                const next = [...sections]
                next[i] = { ...s, enabled: e.target.checked }
                onChange(next)
              }}
            />
            فعال
          </label>
          <input
            className="admin-input mt-2"
            placeholder="عنوان"
            value={s.title || ''}
            onChange={(e) => {
              const next = [...sections]
              next[i] = { ...s, title: e.target.value }
              onChange(next)
            }}
          />
          <input
            type="number"
            className="admin-input mt-2"
            value={s.sortOrder}
            onChange={(e) => {
              const next = [...sections]
              next[i] = { ...s, sortOrder: Number(e.target.value) }
              onChange([...next].sort((a, b) => a.sortOrder - b.sortOrder))
            }}
          />
        </div>
      ))}
    </div>
  )
}

function PagesTab({ pages, media }: { pages: SitePageRow[]; media: Media[] }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-white/50">صفحات منتشرشده در مسیر /p/[slug] نمایش داده می‌شوند.</p>
      <ul className="space-y-1 text-sm">
        {pages.map((p) => (
          <li key={p.id}>
            /p/{p.slug} — {p.title} ({p.status})
          </li>
        ))}
      </ul>
      <form action={upsertSitePageAction} className="grid gap-2 md:grid-cols-2">
        <input name="slug" className="admin-input" placeholder="slug" required />
        <input name="title" className="admin-input" placeholder="عنوان" required />
        <input name="metaTitle" className="admin-input" placeholder="SEO title" />
        <input name="metaDescription" className="admin-input" placeholder="SEO description" />
        <select name="heroImageUrl" className="admin-input">
          <option value="">بدون تصویر</option>
          {media.map((m) => (
            <option key={m.id} value={m.url}>
              {m.filename}
            </option>
          ))}
        </select>
        <select name="status" className="admin-input" defaultValue="DRAFT">
          <option value="DRAFT">پیش‌نویس</option>
          <option value="PUBLISHED">منتشر شده</option>
        </select>
        <textarea name="bodyHtml" className="admin-input min-h-24 md:col-span-2" placeholder="HTML محتوا" />
        <button type="submit" className="btn-primary md:col-span-2 md:w-fit">
          ایجاد / به‌روزرسانی صفحه
        </button>
      </form>
    </div>
  )
}

function MediaTab({
  media,
  onPick,
}: {
  media: Media[]
  onPick: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploading(true)
    const fd = new FormData(e.currentTarget)
    await fetch('/api/admin/media/upload', { method: 'POST', body: fd })
    setUploading(false)
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onUpload} className="flex flex-wrap items-end gap-3">
        <input name="file" type="file" accept="image/*" required className="text-sm" />
        <button type="submit" className="btn-primary" disabled={uploading}>
          {uploading ? 'در حال آپلود…' : 'آپلود'}
        </button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {media.map((m) => (
          <MediaCard key={m.id} m={m} onPick={onPick} />
        ))}
      </div>
    </div>
  )
}

function MediaCard({ m, onPick }: { m: Media; onPick: (url: string) => void }) {
  return (
    <div className="rounded-lg border border-mr-border p-2">
      <img src={m.url} alt="" className="h-32 w-full rounded object-cover" />
      <p className="mt-2 truncate text-xs">{m.filename}</p>
      <p className="text-[10px] text-white/45">{(m.sizeBytes / 1024).toFixed(0)} KB</p>
      <button type="button" className="mt-2 text-xs text-mr-red" onClick={() => onPick(m.url)}>
        استفاده در هیرو
      </button>
    </div>
  )
}

function HistoryTab({
  revisions,
  onRestore,
}: {
  revisions: Revision[]
  onRestore: (id: string) => Promise<void>
}) {
  return (
    <ul className="space-y-2 text-sm">
      {revisions.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-mr-border px-3 py-2">
          <span>
            {r.label || 'نسخه'} — {new Date(r.createdAt).toLocaleString('fa-IR')}
          </span>
          <button type="button" className="text-xs text-mr-red" onClick={() => onRestore(r.id)}>
            بازگردانی به پیش‌نویس
          </button>
        </li>
      ))}
      {revisions.length === 0 ? <li className="text-white/50">هنوز نسخه‌ای ثبت نشده.</li> : null}
    </ul>
  )
}
