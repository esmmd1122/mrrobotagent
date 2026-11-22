'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2, ExternalLink, Image as ImageIcon, Loader2, Save } from 'lucide-react'
import {
  ImageUploaderField,
  type MediaLibraryOption,
} from '@/components/admin/ImageUploaderField'

type Props = {
  initialImageUrl: string
  initialImageAlt: string
  initialMedia: MediaLibraryOption[]
}

export function AdminAISectionImageCard({
  initialImageUrl,
  initialImageAlt,
  initialMedia,
}: Props) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl)
  const [imageAlt, setImageAlt] = useState(initialImageAlt)
  const [savedUrl, setSavedUrl] = useState(initialImageUrl)
  const [savedAlt, setSavedAlt] = useState(initialImageAlt)
  const [media, setMedia] = useState<MediaLibraryOption[]>(initialMedia)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const hasUnsavedChanges =
    imageUrl.trim() !== savedUrl.trim() || imageAlt.trim() !== savedAlt.trim()

  async function handleSave() {
    if (uploading || saving) return
    setSaving(true)
    setStatusMessage(null)

    try {
      const res = await fetch('/api/admin/ai-section-image', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrl.trim(),
          imageAlt: imageAlt.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        imageUrl?: string
        imageAlt?: string
        error?: string
      }

      if (!res.ok || !data.ok) {
        setStatusMessage({
          type: 'error',
          text: data.error || 'ذخیره تصویر بخش MR.ROBOT AI با خطا مواجه شد.',
        })
        return
      }

      const nextUrl = data.imageUrl ?? ''
      const nextAlt = data.imageAlt ?? ''
      setImageUrl(nextUrl)
      setImageAlt(nextAlt)
      setSavedUrl(nextUrl)
      setSavedAlt(nextAlt)
      setStatusMessage({
        type: 'success',
        text: nextUrl
          ? 'تصویر بخش MR.ROBOT AI با موفقیت ذخیره و در صفحه اصلی سایت منتشر شد.'
          : 'تصویر بخش MR.ROBOT AI حذف شد و نمای جایگزین استاندارد در صفحه اصلی نمایش داده می‌شود.',
      })
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'خطای ارتباط با سرور هنگام ذخیره تصویر. لطفاً دوباره تلاش کنید.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="admin-card space-y-4 p-5"
      data-testid="admin-ai-section-image-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#38bdf8]/35 bg-[#38bdf8]/12 text-[#38bdf8]">
            <ImageIcon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">
              تصویر بخش MR.ROBOT AI در صفحه اصلی
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              تصویر کارت سمت چپ بخش «MR.ROBOT AI — ایده‌ات را به یک سیستم هوشمند تبدیل کن» را از
              اینجا آپلود، جایگزین یا حذف کنید. فایل روی فضای ذخیره‌سازی ابری (Cloudinary) ذخیره
              شده و به‌صورت خودکار با تنظیمات CMS سایت همگام می‌شود.
            </p>
          </div>
        </div>

        <Link
          href="/admin/appearance"
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/30 hover:text-white"
        >
          <span>تنظیمات کامل CMS</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ImageUploaderField
            label="تصویر اختصاصی کارت MR.ROBOT AI"
            description="پیش‌نمایش تصویر بلافاصله پس از آپلود نمایش داده می‌شود؛ برای انتشار دائمی روی دکمه ذخیره کلیک کنید."
            folder="sections"
            value={imageUrl}
            onChange={(url) => {
              setImageUrl(url)
              setStatusMessage(null)
            }}
            onUploadingChange={setUploading}
            altText={imageAlt || 'تصویر اختصاصی بخش MR.ROBOT AI'}
            aspectClass="aspect-[16/9]"
            mediaLibrary={media}
            onUploaded={(asset) => {
              setMedia((prev) => [asset, ...prev.filter((m) => m.id !== asset.id)])
            }}
          />
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#0d1017] p-4 lg:col-span-4">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="ai-section-image-alt"
                className="mb-1.5 block text-xs font-semibold text-white/85"
              >
                متن جایگزین تصویر (Alt Text)
              </label>
              <input
                id="ai-section-image-alt"
                type="text"
                className="admin-input text-xs"
                placeholder="مثال: آزمایشگاه هوش مصنوعی MR.ROBOT"
                value={imageAlt}
                onChange={(e) => {
                  setImageAlt(e.target.value)
                  setStatusMessage(null)
                }}
              />
              <p className="mt-1 text-[11px] text-white/45">
                برای دسترس‌پذیری و سئو صفحه اصلی استفاده می‌شود.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-white/65">
              <p className="font-semibold text-white/85">وضعیت فعلی انتشار:</p>
              <p className="mt-1 leading-relaxed">
                {savedUrl
                  ? 'یک تصویر اختصاصی ذخیره و روی بخش MR.ROBOT AI صفحه اصلی فعال است.'
                  : 'تصویری ثبت نشده است؛ نمای جایگزین استاندارد MR.ROBOT AI نمایش داده می‌شود.'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-white/10 pt-3">
            {hasUnsavedChanges ? (
              <p className="text-[11px] font-medium text-amber-300">
                تغییرات جدید آماده ذخیره هستند — برای اعمال دائمی ذخیره کنید.
              </p>
            ) : null}

            <button
              type="button"
              data-testid="save-ai-section-image-btn"
              disabled={uploading || saving || !hasUnsavedChanges}
              onClick={handleSave}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-4 text-xs font-bold text-white transition hover:bg-[#ff1e18] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>در حال ذخیره...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>ذخیره تصویر بخش MR.ROBOT AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {statusMessage ? (
        <div
          role={statusMessage.type === 'error' ? 'alert' : 'status'}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : null}
          <span>{statusMessage.text}</span>
        </div>
      ) : null}
    </section>
  )
}
