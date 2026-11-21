'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Globe,
  History,
  Image as ImageIcon,
  Layout,
  Menu as MenuIcon,
  Monitor,
  Palette,
  Plus,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { NavLinkConfig, SectionConfig, WebsiteConfig } from '@/lib/site-config/types'
import { CMS_SECTION_LABELS, normalizeSections } from '@/lib/site-config/cms-helpers'
import { ImageUploaderField, type MediaLibraryOption } from '@/components/admin/ImageUploaderField'
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
  altText?: string | null
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

type ProductOption = {
  id: string
  slug: string
  nameFa: string
  imageUrl: string | null
  isFeatured: boolean
  isVisible: boolean
  categoryName: string
}

type Props = {
  initialDraft: WebsiteConfig
  publishedAt: string | null
  media: Media[]
  pages: SitePageRow[]
  revisions: Revision[]
  products: ProductOption[]
}

const tabs = [
  'homepage',
  'sections',
  'navigation',
  'footer',
  'seo',
  'media',
  'pages',
  'theme',
  'history',
] as const

type TabId = (typeof tabs)[number]

export function WebsiteEditor({
  initialDraft,
  publishedAt,
  media: initialMedia,
  pages,
  revisions,
  products,
}: Props) {
  const [config, setConfig] = useState<WebsiteConfig>(() => ({
    ...initialDraft,
    sections: normalizeSections(initialDraft.sections),
  }))
  const [mediaList, setMediaList] = useState<Media[]>(initialMedia)
  const [tab, setTab] = useState<TabId>('homepage')
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [publishConfirmed, setPublishConfirmed] = useState(false)
  const [publishLabel, setPublishLabel] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(publishedAt)

  const configJson = useMemo(() => JSON.stringify(config), [config])

  const mediaOptions: MediaLibraryOption[] = useMemo(
    () =>
      mediaList.map((m) => ({
        id: m.id,
        url: m.url,
        filename: m.filename,
        sizeBytes: m.sizeBytes,
        altText: m.altText,
      })),
    [mediaList],
  )

  function handleUploadedAsset(asset: MediaLibraryOption) {
    setMediaList((prev) => {
      if (prev.some((m) => m.id === asset.id)) return prev
      return [
        {
          id: asset.id,
          url: asset.url,
          filename: asset.filename,
          sizeBytes: asset.sizeBytes ?? 0,
          altText: asset.altText ?? null,
        },
        ...prev,
      ]
    })
  }

  async function saveDraft() {
    setBusy(true)
    setMessage(null)
    try {
      await saveWebsiteDraftAction(configJson)
      setMessage({ type: 'ok', text: 'پیش‌نویس با موفقیت ذخیره شد. برای نمایش عمومی، دکمه «انتشار تغییرات» را بزنید.' })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'خطا در ذخیره پیش‌نویس' })
    }
    setBusy(false)
  }

  async function publish() {
    if (!publishConfirmed) {
      setMessage({ type: 'err', text: 'لطفاً ابتدا تیک تأیید انتشار تغییرات در سایت عمومی را فعال کنید.' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      await saveWebsiteDraftAction(configJson)
      await publishWebsiteAction('PUBLISH', publishLabel.trim() || undefined)
      setLastPublishedAt(new Date().toISOString())
      setPublishConfirmed(false)
      setPublishLabel('')
      setMessage({ type: 'ok', text: 'تغییرات با موفقیت در سایت عمومی منتشر شد.' })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'خطا در انتشار تغییرات' })
    }
    setBusy(false)
  }

  async function startPreview(device: 'desktop' | 'mobile') {
    setBusy(true)
    try {
      await saveWebsiteDraftAction(configJson)
      await fetch('/api/admin/appearance/preview', { method: 'POST' })
      setPreviewDevice(device)
      setPreviewUrl(`/?_preview=1&t=${Date.now()}#hero`)
      setMessage({
        type: 'ok',
        text: `پیش‌نمایش ${device === 'mobile' ? 'موبایل (۳۹۰px)' : 'دسکتاپ'} با آخرین پیش‌نویس فعال شد.`,
      })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'خطا در فعال‌سازی پیش‌نمایش' })
    }
    setBusy(false)
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

  function patchSeo<K extends keyof WebsiteConfig['seo']>(key: K, value: WebsiteConfig['seo'][K]) {
    setConfig((c) => ({ ...c, seo: { ...c.seo, [key]: value } }))
  }

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="admin-card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#e10600]">
            MR.ROBOT CMS
          </p>
          <h1 className="mt-1 text-xl font-black text-white">مدیریت محتوا و ظاهر وب‌سایت</h1>
          <p className="mt-1 text-xs text-white/55">
            آخرین انتشار عمومی:{' '}
            {lastPublishedAt ? new Date(lastPublishedAt).toLocaleString('fa-IR') : 'هنوز منتشر نشده'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => startPreview('desktop')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/85 transition hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>پیش‌نمایش دسکتاپ</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => startPreview('mobile')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/85 transition hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>پیش‌نمایش موبایل</span>
          </button>
          {previewUrl ? (
            <button
              type="button"
              onClick={endPreview}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200"
            >
              بستن پیش‌نمایش
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={saveDraft}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#e10600]/60 bg-[#e10600]/15 px-4 py-2 text-xs font-bold text-white transition hover:bg-[#e10600]/25 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5 text-[#ff5a56]" />
            <span>{busy ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'}</span>
          </button>
        </div>
      </div>

      {message ? (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100'
              : 'border-red-500/40 bg-red-500/10 text-red-100'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      ) : null}

      {/* CMS Section Tabs */}
      <div className="admin-card flex flex-wrap gap-1.5 p-2.5" role="tablist" aria-label="بخش‌های مدیریت محتوا">
        {tabs.map((t) => {
          const Icon = tabIcon(t)
          const active = tab === t
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-[#e10600] text-white shadow-sm shadow-[#e10600]/30'
                  : 'text-white/65 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tabLabel(t)}</span>
            </button>
          )
        })}
      </div>

      {/* Active Tab Content */}
      <div className="admin-card p-4 sm:p-5">
        {tab === 'homepage' && (
          <HomeTab
            config={config}
            patchHero={patchHero}
            media={mediaOptions}
            products={products}
            onUploaded={handleUploadedAsset}
          />
        )}
        {tab === 'sections' && (
          <SectionsTab
            sections={config.sections}
            media={mediaOptions}
            onUploaded={handleUploadedAsset}
            onChange={(sections) => setConfig((c) => ({ ...c, sections }))}
          />
        )}
        {tab === 'navigation' && (
          <NavTab
            config={config}
            onHeader={(header) => setConfig((c) => ({ ...c, navigation: { ...c.navigation, header } }))}
            onCta={(purchaseCta) =>
              setConfig((c) => ({ ...c, navigation: { ...c.navigation, purchaseCta } }))
            }
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
        {tab === 'seo' && (
          <SeoTab
            config={config}
            patchSeo={patchSeo}
            media={mediaOptions}
            onUploaded={handleUploadedAsset}
          />
        )}
        {tab === 'media' && (
          <MediaTab
            media={mediaList}
            onUploaded={handleUploadedAsset}
            onPickBanner={(url) => {
              patchHero('bannerImageUrl', url)
              setMessage({ type: 'ok', text: 'تصویر انتخاب‌شده برای بنر صفحه اصلی تنظیم شد.' })
            }}
            onPickOg={(url) => {
              patchSeo('ogImageUrl', url)
              setMessage({ type: 'ok', text: 'تصویر انتخاب‌شده برای Open Graph (سئو) تنظیم شد.' })
            }}
          />
        )}
        {tab === 'pages' && (
          <PagesTab pages={pages} media={mediaOptions} onUploaded={handleUploadedAsset} />
        )}
        {tab === 'theme' && <ThemeTab config={config} patchTheme={patchTheme} />}
        {tab === 'history' && (
          <HistoryTab
            revisions={revisions}
            onRestore={async (id) => {
              setBusy(true)
              try {
                await restoreRevisionAction(id)
                setMessage({
                  type: 'ok',
                  text: 'نسخه انتخاب‌شده به پیش‌نویس بازگردانی شد. صفحه را بارگذاری مجدد کنید یا برای اعمال عمومی انتشار دهید.',
                })
              } catch (e) {
                setMessage({ type: 'err', text: e instanceof Error ? e.message : 'خطا در بازگردانی نسخه' })
              }
              setBusy(false)
            }}
          />
        )}
      </div>

      {/* Safe Publish Bar */}
      <div className="admin-card space-y-3 border-[#e10600]/30 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-white">انتشار تغییرات در سایت عمومی</p>
            <p className="mt-0.5 text-xs text-white/55">
              تغییرات پیش‌نویس تا زمان انتشار، فقط در حالت پیش‌نمایش دیده می‌شوند و بازدیدکنندگان نسخه منتشرشده قبلی را مشاهده می‌کنند.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2.5">
            <input
              className="admin-input max-w-md text-xs"
              placeholder="یادداشت کوتاه این نسخه (اختیاری — مثلاً: تغییر بنر و معرفی محصولات ویژه)"
              value={publishLabel}
              onChange={(e) => setPublishLabel(e.target.value)}
            />
            <label className="flex cursor-pointer items-center gap-2 text-xs text-white/85">
              <input
                type="checkbox"
                checked={publishConfirmed}
                onChange={(e) => setPublishConfirmed(e.target.checked)}
                className="h-4 w-4 accent-[#e10600]"
              />
              <span>تأیید می‌کنم این تنظیمات در وب‌سایت عمومی MR.ROBOT منتشر شود.</span>
            </label>
          </div>

          <button
            type="button"
            disabled={busy || !publishConfirmed}
            onClick={publish}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#e10600] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#e10600]/25 transition hover:bg-[#c80500] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Send className="h-4 w-4" />
            <span>{busy ? 'در حال انتشار...' : 'ذخیره و انتشار در سایت'}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Frame */}
      {previewUrl ? (
        <div className="admin-card space-y-2 overflow-hidden p-3">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>
              پیش‌نمایش زنده ({previewDevice === 'mobile' ? 'موبایل ۳۹۰px' : 'دسکتاپ'})
            </span>
            <button type="button" onClick={endPreview} className="text-red-300 hover:underline">
              بستن
            </button>
          </div>
          <div className="flex justify-center rounded-lg bg-black/60 p-2">
            <iframe
              title="پیش‌نمایش سایت"
              src={previewUrl}
              className={`h-[70vh] rounded-lg border border-white/15 bg-black ${
                previewDevice === 'mobile' ? 'w-[390px] max-w-full' : 'w-full'
              }`}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function tabLabel(t: TabId) {
  const map: Record<TabId, string> = {
    homepage: 'صفحه اصلی و هیرو',
    sections: 'بخش‌های صفحه',
    navigation: 'منوی ناوبری',
    footer: 'فوتر و تماس',
    seo: 'سئو و OG',
    media: 'کتابخانه رسانه',
    pages: 'صفحات مستقل',
    theme: 'تم و رنگ‌بندی',
    history: 'تاریخچه نسخه‌ها',
  }
  return map[t]
}

function tabIcon(t: TabId) {
  const map: Record<TabId, typeof Sparkles> = {
    homepage: Sparkles,
    sections: Layout,
    navigation: MenuIcon,
    footer: FileText,
    seo: Globe,
    media: ImageIcon,
    pages: FileText,
    theme: Palette,
    history: History,
  }
  return map[t]
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm font-medium text-white/85">
      <span>{label}</span>
      {hint ? <span className="mt-0.5 block text-[11px] font-normal text-white/45">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function HomeTab({
  config,
  patchHero,
  media,
  products,
  onUploaded,
}: {
  config: WebsiteConfig
  patchHero: <K extends keyof WebsiteConfig['hero']>(k: K, v: WebsiteConfig['hero'][K]) => void
  media: MediaLibraryOption[]
  products: ProductOption[]
  onUploaded: (asset: MediaLibraryOption) => void
}) {
  const h = config.hero
  const selectedSlugs = new Set(h.featuredProductSlugs ?? [])

  function toggleFeaturedSlug(slug: string) {
    const next = new Set(selectedSlugs)
    if (next.has(slug)) {
      next.delete(slug)
    } else {
      next.add(slug)
    }
    patchHero('featuredProductSlugs', Array.from(next))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white">تنظیمات بخش هیرو و صفحه اصلی</h2>
        <p className="mt-1 text-xs text-white/55">
          تیتر اصلی، شعار، دکمه‌های دعوت به اقدام، نوار اطلاع‌رسانی و بنر صفحه اصلی را از اینجا مدیریت کنید. شخصیت سه‌بعدی MR.ROBOT و دستیار هوشمند در صحنه حفظ می‌شوند.
        </p>
      </div>

      {/* Announcement Banner */}
      <div className="rounded-xl border border-white/10 bg-[#0d1017] p-4 space-y-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-white">
          <input
            type="checkbox"
            checked={Boolean(h.announcementEnabled)}
            onChange={(e) => patchHero('announcementEnabled', e.target.checked)}
            className="h-4 w-4 accent-[#e10600]"
          />
          <span>نمایش نوار اطلاع‌رسانی ویژه در بالای صفحه اصلی</span>
        </label>
        <input
          className="admin-input"
          placeholder="مثال: تخفیف ویژه اشتراک‌های هوش مصنوعی تا پایان هفته فعال است"
          value={h.announcementText || ''}
          onChange={(e) => patchHero('announcementText', e.target.value)}
        />
      </div>

      {/* Main Hero Texts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="تیتر اصلی هیرو (Headline)" hint="تیتر بزرگ بالای صفحه اصلی">
          <input
            className="admin-input"
            placeholder="نسل نوین خدمات دیجیتال با امضای MR.ROBOT"
            value={h.headline || ''}
            onChange={(e) => patchHero('headline', e.target.value)}
          />
        </Field>
        <Field label="شعار بالای تیتر (Kicker / Slogan)">
          <input
            className="admin-input"
            value={h.slogan}
            onChange={(e) => patchHero('slogan', e.target.value)}
          />
        </Field>
        <Field label="توضیح اصلی زیر تیتر (Subtitle)">
          <textarea
            className="admin-input min-h-24"
            value={h.subtitle}
            onChange={(e) => patchHero('subtitle', e.target.value)}
          />
        </Field>
        <Field label="متن تکمیلی اختیاری (Description)">
          <textarea
            className="admin-input min-h-24"
            placeholder="در صورت نیاز به توضیح کوتاه دوم زیر متن اصلی..."
            value={h.description || ''}
            onChange={(e) => patchHero('description', e.target.value)}
          />
        </Field>
      </div>

      {/* Hero Buttons */}
      <div className="grid gap-4 rounded-xl border border-white/10 bg-[#0d1017] p-4 md:grid-cols-2">
        <Field label="متن دکمه اصلی هیرو">
          <input
            className="admin-input"
            value={h.ctaPrimary.label}
            onChange={(e) => patchHero('ctaPrimary', { ...h.ctaPrimary, label: e.target.value })}
          />
        </Field>
        <Field label="مقصد دکمه اصلی (لینک یا شناسه بخش)">
          <input
            dir="ltr"
            className="admin-input"
            value={h.ctaPrimary.href}
            onChange={(e) => patchHero('ctaPrimary', { ...h.ctaPrimary, href: e.target.value })}
          />
        </Field>
        <Field label="متن دکمه ثانویه هیرو">
          <input
            className="admin-input"
            value={h.ctaSecondary.label}
            onChange={(e) => patchHero('ctaSecondary', { ...h.ctaSecondary, label: e.target.value })}
          />
        </Field>
        <Field label="مقصد دکمه ثانویه">
          <input
            dir="ltr"
            className="admin-input"
            value={h.ctaSecondary.href}
            onChange={(e) => patchHero('ctaSecondary', { ...h.ctaSecondary, href: e.target.value })}
          />
        </Field>
      </div>

      {/* Optional Homepage Promotional Banner Upload */}
      <div className="rounded-xl border border-white/10 bg-[#0d1017] p-4 space-y-3">
        <ImageUploaderField
          label="بنر تصویری اختیاری صفحه اصلی"
          description="در صورت آپلود بنر، به‌صورت هماهنگ در بخش هیرو نمایش داده می‌شود بدون اینکه روی شخصیت سه‌بعدی MR.ROBOT تداخل ایجاد کند."
          folder="banners"
          value={h.bannerImageUrl || ''}
          onChange={(url) => patchHero('bannerImageUrl', url)}
          altText={h.bannerAlt || h.headline || h.slogan}
          mediaLibrary={media}
          onUploaded={onUploaded}
        />
        <Field label="متن جایگزین بنر (Alt Text برای سئو و دسترس‌پذیری)">
          <input
            className="admin-input"
            placeholder="توضیح کوتاه درباره محتوای تصویر بنر..."
            value={h.bannerAlt || ''}
            onChange={(e) => patchHero('bannerAlt', e.target.value)}
          />
        </Field>
      </div>

      {/* Featured Products Priority Selector */}
      <div className="rounded-xl border border-white/10 bg-[#0d1017] p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-white">محصولات و سرویس‌های ویژه در صفحه اصلی</p>
          <p className="mt-0.5 text-xs text-white/55">
            محصولات انتخاب‌شده در ابتدای فروشگاه تعاملی صفحه اصلی نمایش داده می‌شوند (در صورت انتخاب نکردن، ترتیب پیش‌فرض فروشگاه اعمال می‌شود).
          </p>
        </div>
        {products.length === 0 ? (
          <p className="text-xs text-white/45">هنوز محصولی در فروشگاه ثبت نشده است.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const checked = selectedSlugs.has(p.slug)
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition ${
                    checked
                      ? 'border-[#e10600]/60 bg-[#e10600]/12 text-white'
                      : 'border-white/10 bg-white/[0.02] text-white/75 hover:border-white/25'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFeaturedSlug(p.slug)}
                    className="h-4 w-4 accent-[#e10600]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.nameFa}</p>
                    <p className="truncate text-[10px] text-white/45">
                      {p.categoryName} {!p.isVisible ? '• غیرفعال' : ''}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/85">
        <input
          type="checkbox"
          checked={h.enabled}
          onChange={(e) => patchHero('enabled', e.target.checked)}
          className="h-4 w-4 accent-[#e10600]"
        />
        <span>نمایش بخش هیرو در صفحه اصلی</span>
      </label>
    </div>
  )
}

function SectionsTab({
  sections,
  media,
  onUploaded,
  onChange,
}: {
  sections: SectionConfig[]
  media: MediaLibraryOption[]
  onUploaded: (asset: MediaLibraryOption) => void
  onChange: (s: SectionConfig[]) => void
}) {
  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)

  function updateSection(id: SectionConfig['id'], patch: Partial<SectionConfig>) {
    onChange(ordered.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const copy = [...ordered]
    const [moved] = copy.splice(index, 1)
    copy.splice(target, 0, moved)
    const reindexed = copy.map((item, idx) => ({ ...item, sortOrder: idx + 1 }))
    onChange(reindexed)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white">مدیریت بخش‌های صفحه اصلی</h2>
        <p className="mt-1 text-xs text-white/55">
          هر بخش را می‌توانید فعال یا غیرفعال کنید، عنوان و توضیحات آن را ویرایش نمایید، تصویر اختصاصی آپلود کنید و ترتیب نمایش را تغییر دهید. غیرفعال کردن هر بخش هیچ داده‌ای را حذف نمی‌کند.
        </p>
      </div>

      <div className="space-y-4">
        {ordered.map((s, idx) => (
          <div
            key={s.id}
            className={`rounded-xl border p-4 transition ${
              s.enabled
                ? 'border-white/12 bg-[#0d1017]'
                : 'border-white/8 bg-[#0a0c11]/70 opacity-75'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-xs font-bold text-white/70">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">
                    {CMS_SECTION_LABELS[s.id] || s.id}
                  </p>
                  <p className="text-[11px] text-white/45" dir="ltr">
                    section:{s.id}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSection(s.id, { enabled: !s.enabled })}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                    s.enabled
                      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/15 bg-white/5 text-white/60'
                  }`}
                >
                  {s.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span>{s.enabled ? 'نمایش فعال' : 'مخفی در سایت'}</span>
                </button>

                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveSection(idx, -1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/75 hover:text-white disabled:opacity-30"
                  title="انتقال به بالا"
                  aria-label="انتقال بخش به بالا"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === ordered.length - 1}
                  onClick={() => moveSection(idx, 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/75 hover:text-white disabled:opacity-30"
                  title="انتقال به پایین"
                  aria-label="انتقال بخش به پایین"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="عنوان نمایشی بخش">
                <input
                  className="admin-input"
                  value={s.title || ''}
                  onChange={(e) => updateSection(s.id, { title: e.target.value })}
                />
              </Field>
              <Field label="متن جایگزین تصویر (Alt Text)">
                <input
                  className="admin-input"
                  placeholder="توضیح کوتاه تصویر بخش (اختیاری)"
                  value={s.imageAlt || ''}
                  onChange={(e) => updateSection(s.id, { imageAlt: e.target.value })}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="توضیحات بخش">
                  <textarea
                    className="admin-input min-h-20"
                    value={s.description || ''}
                    onChange={(e) => updateSection(s.id, { description: e.target.value })}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <ImageUploaderField
                  label="تصویر یا بنر اختیاری این بخش"
                  folder="sections"
                  value={s.imageUrl || ''}
                  onChange={(url) => updateSection(s.id, { imageUrl: url })}
                  altText={s.imageAlt || s.title || CMS_SECTION_LABELS[s.id]}
                  mediaLibrary={media}
                  onUploaded={onUploaded}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NavTab({
  config,
  onHeader,
  onCta,
}: {
  config: WebsiteConfig
  onHeader: (header: NavLinkConfig[]) => void
  onCta: (cta: WebsiteConfig['navigation']['purchaseCta']) => void
}) {
  const links = config.navigation.header

  function addLink() {
    onHeader([
      ...links,
      {
        id: `nav-${Date.now()}`,
        label: 'لینک جدید',
        href: '/shop',
        enabled: true,
      },
    ])
  }

  function removeLink(idx: number) {
    onHeader(links.filter((_, i) => i !== idx))
  }

  function moveLink(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= links.length) return
    const copy = [...links]
    const [item] = copy.splice(idx, 1)
    copy.splice(target, 0, item)
    onHeader(copy)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">مدیریت لینک‌های هدر و ناوبری</h2>
          <p className="mt-1 text-xs text-white/55">
            لینک‌های منوی بالا را ویرایش، مرتب یا فعال/غیرفعال کنید.
          </p>
        </div>
        <button
          type="button"
          onClick={addLink}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#e10600]/60"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>افزودن لینک جدید</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {links.map((link, i) => (
          <div
            key={link.id}
            className="grid gap-2.5 rounded-xl border border-white/10 bg-[#0d1017] p-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center"
          >
            <input
              className="admin-input"
              placeholder="عنوان لینک"
              value={link.label}
              onChange={(e) => {
                const next = [...links]
                next[i] = { ...link, label: e.target.value }
                onHeader(next)
              }}
            />
            <input
              dir="ltr"
              className="admin-input"
              placeholder="/shop یا #services"
              value={link.href}
              onChange={(e) => {
                const next = [...links]
                next[i] = { ...link, href: e.target.value }
                onHeader(next)
              }}
            />
            <label className="flex cursor-pointer items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={link.enabled}
                onChange={(e) => {
                  const next = [...links]
                  next[i] = { ...link, enabled: e.target.checked }
                  onHeader(next)
                }}
                className="h-4 w-4 accent-[#e10600]"
              />
              <span>فعال</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => moveLink(i, -1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 text-white/60 hover:text-white disabled:opacity-30"
                aria-label="بالا"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={i === links.length - 1}
                onClick={() => moveLink(i, 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 text-white/60 hover:text-white disabled:opacity-30"
                aria-label="پایین"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-500/30 text-red-300 hover:bg-red-500/15"
                aria-label="حذف لینک"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 rounded-xl border border-white/10 bg-[#0d1017] p-4 md:grid-cols-2">
        <Field label="دکمه اصلی هدر (CTA) — متن">
          <input
            className="admin-input"
            value={config.navigation.purchaseCta.label}
            onChange={(e) => onCta({ ...config.navigation.purchaseCta, label: e.target.value })}
          />
        </Field>
        <Field label="دکمه اصلی هدر (CTA) — لینک">
          <input
            dir="ltr"
            className="admin-input"
            value={config.navigation.purchaseCta.href}
            onChange={(e) => onCta({ ...config.navigation.purchaseCta, href: e.target.value })}
          />
        </Field>
      </div>
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
  onQuickLinks: (links: NavLinkConfig[]) => void
}) {
  const f = config.footer
  const quickLinks = config.navigation.footerQuickLinks

  function addFooterLink() {
    onQuickLinks([
      ...quickLinks,
      { id: `f-${Date.now()}`, label: 'لینک جدید', href: '/shop', enabled: true },
    ])
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white">تنظیمات فوتر، اطلاعات تماس و شبکه‌های اجتماعی</h2>
        <p className="mt-1 text-xs text-white/55">
          این اطلاعات مستقیماً در فوتر تمامی صفحات فروشگاه نمایش داده می‌شوند.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="توضیح کوتاه برند در فوتر">
          <textarea
            className="admin-input min-h-24"
            value={f.tagline}
            onChange={(e) => onChange({ ...f, tagline: e.target.value })}
          />
        </Field>
        <Field label="متن ستون سوم (پشتیبانی / آینده پلتفرم)">
          <textarea
            className="admin-input min-h-24"
            value={f.futureText}
            onChange={(e) => onChange({ ...f, futureText: e.target.value })}
          />
        </Field>
        <Field label="عنوان ستون لینک‌های سریع">
          <input
            className="admin-input"
            value={f.columnTitleLinks}
            onChange={(e) => onChange({ ...f, columnTitleLinks: e.target.value })}
          />
        </Field>
        <Field label="عنوان ستون سوم">
          <input
            className="admin-input"
            value={f.columnTitleFuture}
            onChange={(e) => onChange({ ...f, columnTitleFuture: e.target.value })}
          />
        </Field>
      </div>

      {/* Contact & Support Info */}
      <div className="grid gap-4 rounded-xl border border-white/10 bg-[#0d1017] p-4 md:grid-cols-2">
        <p className="text-sm font-bold text-white md:col-span-2">اطلاعات تماس و ساعات پاسخ‌گویی</p>
        <Field label="شماره تماس (اختیاری)">
          <input
            dir="ltr"
            className="admin-input"
            placeholder="+98 ..."
            value={f.contactPhone || ''}
            onChange={(e) => onChange({ ...f, contactPhone: e.target.value })}
          />
        </Field>
        <Field label="ایمیل پشتیبانی (اختیاری)">
          <input
            dir="ltr"
            className="admin-input"
            placeholder="support@mrrobot.ir"
            value={f.contactEmail || ''}
            onChange={(e) => onChange({ ...f, contactEmail: e.target.value })}
          />
        </Field>
        <Field label="ساعات پاسخ‌گویی پشتیبانی">
          <input
            className="admin-input"
            placeholder="همه‌روزه ۹ تا ۲۳"
            value={f.supportHours || ''}
            onChange={(e) => onChange({ ...f, supportHours: e.target.value })}
          />
        </Field>
        <Field label="آدرس یا شهر (اختیاری)">
          <input
            className="admin-input"
            placeholder="تهران، ..."
            value={f.contactAddress || ''}
            onChange={(e) => onChange({ ...f, contactAddress: e.target.value })}
          />
        </Field>
      </div>

      {/* Social Links */}
      <div className="grid gap-4 rounded-xl border border-white/10 bg-[#0d1017] p-4 md:grid-cols-3">
        <p className="text-sm font-bold text-white md:col-span-3">شبکه‌های اجتماعی</p>
        <Field label="لینک تلگرام">
          <input
            dir="ltr"
            className="admin-input"
            placeholder="https://t.me/..."
            value={f.social.telegram || ''}
            onChange={(e) => onChange({ ...f, social: { ...f.social, telegram: e.target.value } })}
          />
        </Field>
        <Field label="لینک اینستاگرام">
          <input
            dir="ltr"
            className="admin-input"
            placeholder="https://instagram.com/..."
            value={f.social.instagram || ''}
            onChange={(e) => onChange({ ...f, social: { ...f.social, instagram: e.target.value } })}
          />
        </Field>
        <Field label="لینک ایکس (X / Twitter)">
          <input
            dir="ltr"
            className="admin-input"
            placeholder="https://x.com/..."
            value={f.social.twitter || ''}
            onChange={(e) => onChange({ ...f, social: { ...f.social, twitter: e.target.value } })}
          />
        </Field>
      </div>

      {/* Quick Links */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-[#0d1017] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-white">لینک‌های سریع فوتر</p>
          <button
            type="button"
            onClick={addFooterLink}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:border-[#e10600]/60"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>افزودن لینک فوتر</span>
          </button>
        </div>

        <div className="space-y-2">
          {quickLinks.map((link, i) => (
            <div key={link.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
              <input
                className="admin-input"
                placeholder="عنوان"
                value={link.label}
                onChange={(e) => {
                  const next = [...quickLinks]
                  next[i] = { ...link, label: e.target.value }
                  onQuickLinks(next)
                }}
              />
              <input
                dir="ltr"
                className="admin-input"
                placeholder="/shop"
                value={link.href}
                onChange={(e) => {
                  const next = [...quickLinks]
                  next[i] = { ...link, href: e.target.value }
                  onQuickLinks(next)
                }}
              />
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/80">
                <input
                  type="checkbox"
                  checked={link.enabled}
                  onChange={(e) => {
                    const next = [...quickLinks]
                    next[i] = { ...link, enabled: e.target.checked }
                    onQuickLinks(next)
                  }}
                  className="h-4 w-4 accent-[#e10600]"
                />
                <span>فعال</span>
              </label>
              <button
                type="button"
                onClick={() => onQuickLinks(quickLinks.filter((_, idx) => idx !== i))}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-500/30 text-red-300 hover:bg-red-500/15"
                aria-label="حذف"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SeoTab({
  config,
  patchSeo,
  media,
  onUploaded,
}: {
  config: WebsiteConfig
  patchSeo: <K extends keyof WebsiteConfig['seo']>(k: K, v: WebsiteConfig['seo'][K]) => void
  media: MediaLibraryOption[]
  onUploaded: (asset: MediaLibraryOption) => void
}) {
  const s = config.seo
  const titlePreview = s.homeTitle || 'MR.ROBOT | فناوری دیجیتال، هوش مصنوعی و خدمات تخصصی'
  const descPreview =
    s.homeDescription ||
    'مرجع تخصصی اشتراک‌های هوش مصنوعی، سرویس‌های امن VPN و V2Ray، خدمات اپل و تعمیرات موبایل و محصولات دیجیتال MR.ROBOT.'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white">تنظیمات سئو (SEO) و تصویر اشتراک‌گذاری</h2>
        <p className="mt-1 text-xs text-white/55">
          عنوان صفحه، توضیحات متا و تصویر Open Graph هنگام اشتراک‌گذاری لینک سایت در شبکه‌های اجتماعی.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="عنوان متا صفحه اصلی (Page Title)" hint="بهترین طول: ۵۰ تا ۶۵ کاراکتر">
          <input
            className="admin-input"
            value={s.homeTitle || ''}
            onChange={(e) => patchSeo('homeTitle', e.target.value)}
          />
        </Field>
        <Field label="متن جایگزین تصویر Open Graph">
          <input
            className="admin-input"
            placeholder="MR.ROBOT — AI & Digital Services"
            value={s.ogImageAlt || ''}
            onChange={(e) => patchSeo('ogImageAlt', e.target.value)}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="توضیحات متا (Meta Description)" hint="بهترین طول: ۱۲۰ تا ۱۶۰ کاراکتر">
            <textarea
              className="admin-input min-h-24"
              value={s.homeDescription || ''}
              onChange={(e) => patchSeo('homeDescription', e.target.value)}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <ImageUploaderField
            label="تصویر اشتراک‌گذاری (Open Graph Image)"
            description="نسبت پیشنهادی ۱۲۰۰×۶۳۰ پیکسل برای نمایش دقیق در تلگرام، واتساپ و شبکه‌های اجتماعی."
            folder="banners"
            value={s.ogImageUrl || ''}
            onChange={(url) => patchSeo('ogImageUrl', url)}
            altText={s.ogImageAlt || titlePreview}
            mediaLibrary={media}
            onUploaded={onUploaded}
          />
        </div>
      </div>

      {/* Google Search Snippet Preview */}
      <div className="rounded-xl border border-white/10 bg-[#0d1017] p-4">
        <p className="mb-2 text-[11px] font-semibold text-white/45">پیش‌نمایش نتیجه جستجو</p>
        <p className="text-base font-bold text-sky-400">{titlePreview}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/70">{descPreview}</p>
      </div>
    </div>
  )
}

function MediaTab({
  media,
  onUploaded,
  onPickBanner,
  onPickOg,
}: {
  media: Media[]
  onUploaded: (asset: MediaLibraryOption) => void
  onPickBanner: (url: string) => void
  onPickOg: (url: string) => void
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [recentUrl, setRecentUrl] = useState('')

  function copyUrl(id: string, url: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000)
    }
  }

  return (
    <div className="space-y-5">
      <ImageUploaderField
        label="آپلود تصویر جدید به کتابخانه رسانه"
        description="تصاویر آپلودشده در اینجا برای محصولات، بنرها، بخش‌های سایت و سئو قابل استفاده هستند."
        folder="media"
        value={recentUrl}
        onChange={setRecentUrl}
        onUploaded={(asset) => {
          onUploaded(asset)
          setRecentUrl('')
        }}
      />

      <div>
        <h3 className="mb-3 text-sm font-bold text-white">
          تصاویر موجود در کتابخانه ({media.length.toLocaleString('fa-IR')})
        </h3>
        {media.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-[#0d1017] p-6 text-center text-xs text-white/50">
            هنوز تصویری در کتابخانه رسانه آپلود نشده است.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m) => (
              <div
                key={m.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1017]"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-black">
                  <img
                    src={m.url}
                    alt={m.altText || m.filename}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-xs font-semibold text-white">{m.filename}</p>
                  <p className="text-[11px] text-white/45">
                    {(m.sizeBytes / 1024).toFixed(0)} کیلوبایت
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => copyUrl(m.id, m.url)}
                      className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedId === m.id ? 'کپی شد' : 'کپی آدرس'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPickBanner(m.url)}
                      className="rounded border border-[#e10600]/40 bg-[#e10600]/10 px-2.5 py-1 text-[11px] text-red-200 hover:bg-[#e10600]/20"
                    >
                      بنر هیرو
                    </button>
                    <button
                      type="button"
                      onClick={() => onPickOg(m.url)}
                      className="rounded border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-200 hover:bg-sky-500/20"
                    >
                      تصویر سئو
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PagesTab({
  pages,
  media,
  onUploaded,
}: {
  pages: SitePageRow[]
  media: MediaLibraryOption[]
  onUploaded: (asset: MediaLibraryOption) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-white">صفحات محتوایی مستقل</h2>
        <p className="mt-1 text-xs text-white/55">
          صفحات منتشرشده در مسیر <span dir="ltr">/p/[slug]</span> در دسترس بازدیدکنندگان قرار می‌گیرند.
        </p>
      </div>

      {pages.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {pages.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2"
            >
              <div>
                <span className="font-semibold text-white">{p.title}</span>
                <span className="mx-2 text-xs text-white/45" dir="ltr">
                  /p/{p.slug}
                </span>
              </div>
              <span
                className={`rounded border px-2 py-0.5 text-[11px] ${
                  p.status === 'PUBLISHED'
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/15 bg-white/5 text-white/60'
                }`}
              >
                {p.status === 'PUBLISHED' ? 'منتشرشده' : 'پیش‌نویس'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={upsertSitePageAction} className="grid gap-3 rounded-xl border border-white/10 bg-[#0d1017] p-4 md:grid-cols-2">
        <p className="text-sm font-bold text-white md:col-span-2">ایجاد یا ویرایش صفحه</p>
        <input name="slug" dir="ltr" className="admin-input" placeholder="slug (مثلاً about-us)" required />
        <input name="title" className="admin-input" placeholder="عنوان صفحه" required />
        <input name="metaTitle" className="admin-input" placeholder="عنوان سئو (اختیاری)" />
        <input name="metaDescription" className="admin-input" placeholder="توضیحات سئو (اختیاری)" />
        <div className="md:col-span-2">
          <ImageUploaderField
            name="heroImageUrl"
            label="تصویر هدر صفحه (اختیاری)"
            folder="banners"
            mediaLibrary={media}
            onUploaded={onUploaded}
          />
        </div>
        <select name="status" className="admin-input" defaultValue="DRAFT">
          <option value="DRAFT">پیش‌نویس</option>
          <option value="PUBLISHED">منتشر شده</option>
        </select>
        <textarea
          name="bodyHtml"
          className="admin-input min-h-28 md:col-span-2"
          placeholder="محتوای HTML صفحه"
        />
        <button
          type="submit"
          className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#e10600] px-5 py-2 text-sm font-bold text-white md:col-span-2 md:w-fit"
        >
          ذخیره صفحه
        </button>
      </form>
    </div>
  )
}

function ThemeTab({
  config,
  patchTheme,
}: {
  config: WebsiteConfig
  patchTheme: <K extends keyof WebsiteConfig['theme']>(k: K, v: WebsiteConfig['theme'][K]) => void
}) {
  const t = config.theme
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="حالت نمایش">
        <select
          className="admin-input"
          value={t.mode}
          onChange={(e) => patchTheme('mode', e.target.value as 'dark' | 'light')}
        >
          <option value="dark">تیره (هویت اصلی MR.ROBOT)</option>
          <option value="light">روشن</option>
        </select>
      </Field>
      <Field label="رنگ تاکیدی اصلی (قرمز برند)">
        <input
          type="color"
          className="h-10 w-full cursor-pointer rounded border border-white/15 bg-transparent"
          value={t.primaryColor}
          onChange={(e) => patchTheme('primaryColor', e.target.value)}
        />
      </Field>
      <Field label="رنگ سطوح ثانویه">
        <input
          type="color"
          className="h-10 w-full cursor-pointer rounded border border-white/15 bg-transparent"
          value={t.secondaryColor}
          onChange={(e) => patchTheme('secondaryColor', e.target.value)}
        />
      </Field>
      <Field label="رنگ پس‌زمینه">
        <input
          type="color"
          className="h-10 w-full cursor-pointer rounded border border-white/15 bg-transparent"
          value={t.backgroundColor}
          onChange={(e) => patchTheme('backgroundColor', e.target.value)}
        />
      </Field>
      <Field label={`مقیاس اندازه متن (${Math.round(t.fontScale * 100)}%)`}>
        <input
          type="range"
          min={0.85}
          max={1.25}
          step={0.01}
          value={t.fontScale}
          onChange={(e) => patchTheme('fontScale', Number(e.target.value))}
          className="w-full accent-[#e10600]"
        />
      </Field>
      <Field label="انحنای گوشه دکمه‌ها (پیکسل)">
        <input
          type="number"
          min={4}
          max={24}
          className="admin-input"
          value={t.buttonRadius}
          onChange={(e) => patchTheme('buttonRadius', Number(e.target.value))}
        />
      </Field>
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
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-white">تاریخچه نسخه‌های منتشرشده</h2>
        <p className="mt-1 text-xs text-white/55">
          هر بار انتشار، یک نسخه پشتیبان ثبت می‌شود تا در صورت نیاز بتوانید به حالت قبلی بازگردید.
        </p>
      </div>
      <ul className="space-y-2 text-sm">
        {revisions.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0d1017] px-3.5 py-2.5"
          >
            <span className="text-white/85">
              {r.label || 'نسخه منتشرشده'} — {new Date(r.createdAt).toLocaleString('fa-IR')}
            </span>
            <button
              type="button"
              className="rounded border border-[#e10600]/45 bg-[#e10600]/10 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-[#e10600]/20"
              onClick={() => onRestore(r.id)}
            >
              بازگردانی به پیش‌نویس
            </button>
          </li>
        ))}
        {revisions.length === 0 ? (
          <li className="rounded-lg border border-white/10 bg-[#0d1017] p-4 text-center text-xs text-white/50">
            هنوز نسخه‌ای منتشر نشده است.
          </li>
        ) : null}
      </ul>
    </div>
  )
}
