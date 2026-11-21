'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Image as ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import {
  normalizeAndValidateProductImageUrl,
  type StorageProviderStatus,
} from '@/lib/storage-validation'

export type MediaLibraryOption = {
  id: string
  url: string
  filename: string
  sizeBytes?: number
  altText?: string | null
}

type Props = {
  name?: string
  label: string
  description?: string
  value?: string
  defaultValue?: string
  onChange?: (url: string) => void
  onUploadingChange?: (uploading: boolean) => void
  validationError?: string | null
  folder?: 'products' | 'banners' | 'sections' | 'media'
  altText?: string
  aspectClass?: string
  mediaLibrary?: MediaLibraryOption[]
  onUploaded?: (asset: MediaLibraryOption) => void
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const ALLOWED_EXT_RE = /\.(?:jpe?g|png|webp)$/i
const MAX_BYTES = 5 * 1024 * 1024

export function ImageUploaderField({
  name,
  label,
  description,
  value,
  defaultValue = '',
  onChange,
  onUploadingChange,
  validationError = null,
  folder = 'products',
  altText = '',
  aspectClass = 'aspect-[16/10]',
  mediaLibrary = [],
  onUploaded,
}: Props) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isControlled = typeof value === 'string'
  const [internalUrl, setInternalUrl] = useState(defaultValue)
  const currentUrl = isControlled ? value : internalUrl

  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [storage, setStorage] = useState<StorageProviderStatus | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/admin/media/upload', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { storage?: StorageProviderStatus } | null) => {
        if (active && data?.storage) setStorage(data.storage)
      })
      .catch(() => {
        /* non-blocking status fetch */
      })
    return () => {
      active = false
    }
  }, [])

  function setUploadingState(next: boolean) {
    setUploading(next)
    onUploadingChange?.(next)
  }

  function updateUrl(nextUrl: string) {
    if (!isControlled) setInternalUrl(nextUrl)
    onChange?.(nextUrl)
  }

  function validateClientFile(file: File): string | null {
    const normalizedType = file.type.toLowerCase().trim()
    const hasValidType = ALLOWED_TYPES.has(normalizedType)
    const hasValidExtFallback = normalizedType === '' && ALLOWED_EXT_RE.test(file.name || '')
    if (!hasValidType && !hasValidExtFallback) {
      return 'فرمت تصویر مجاز نیست. لطفاً فایل JPG، JPEG، PNG یا WEBP انتخاب کنید.'
    }
    if (file.size <= 0) {
      return 'فایل انتخاب‌شده خالی است.'
    }
    if (file.size > MAX_BYTES) {
      return 'حجم فایل بیشتر از ۵ مگابایت است. لطفاً تصویر کم‌حجم‌تری انتخاب کنید.'
    }
    return null
  }

  function uploadFile(file: File) {
    setUploadError(null)
    setUrlError(null)
    setSuccessMsg(null)

    const clientErr = validateClientFile(file)
    if (clientErr) {
      setUploadError(clientErr)
      return
    }

    setUploadingState(true)
    setProgress(8)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    if (altText.trim()) formData.append('altText', altText.trim())

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/admin/media/upload')

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        const pct = Math.min(94, Math.max(12, Math.round((ev.loaded / ev.total) * 100)))
        setProgress(pct)
      }
    }

    xhr.onload = () => {
      setUploadingState(false)
      let parsed: { ok?: boolean; url?: string; error?: string; asset?: MediaLibraryOption; storage?: StorageProviderStatus } = {}
      try {
        parsed = JSON.parse(xhr.responseText || '{}')
      } catch {
        parsed = {}
      }

      if (xhr.status >= 200 && xhr.status < 300 && parsed.ok && parsed.url) {
        const cleanUrl = parsed.url.trim()
        const check = normalizeAndValidateProductImageUrl(cleanUrl)
        if (!check.ok || !check.url) {
          setProgress(0)
          setUploadError('آدرس بازگشتی از سرویس آپلود معتبر نیست.')
          return
        }
        setProgress(100)
        updateUrl(check.url)
        if (parsed.storage) setStorage(parsed.storage)
        if (parsed.asset) onUploaded?.(parsed.asset)
        setSuccessMsg('تصویر با موفقیت آپلود و آماده ذخیره شد.')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setProgress(0)
        if (xhr.status === 413) {
          setUploadError('حجم تصویر برای ارسال به سرور بیش از حد مجاز است. لطفاً فایل کوچک‌تری انتخاب کنید.')
        } else {
          setUploadError(parsed.error || `آپلود تصویر با خطا مواجه شد (کد ${xhr.status}). لطفاً دوباره تلاش کنید.`)
        }
      }
    }

    xhr.onerror = () => {
      setUploadingState(false)
      setProgress(0)
      setUploadError('خطای شبکه در ارتباط با سرور هنگام آپلود تصویر.')
    }

    xhr.send(formData)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  function handleRemove() {
    updateUrl('')
    setUploadError(null)
    setUrlError(null)
    setSuccessMsg(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleManualUrlChange(rawValue: string) {
    setUploadError(null)
    setSuccessMsg(null)
    updateUrl(rawValue)
    if (!rawValue.trim()) {
      setUrlError(null)
      return
    }
    const check = normalizeAndValidateProductImageUrl(rawValue)
    setUrlError(check.ok ? null : check.messageFa)
  }

  const previewValidation = currentUrl
    ? normalizeAndValidateProductImageUrl(currentUrl)
    : null
  const safePreviewUrl =
    previewValidation && previewValidation.ok && previewValidation.url
      ? previewValidation.url
      : null
  const activeValidationError = validationError || urlError

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-semibold text-white">
          {label}
        </label>
        {storage ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] ${
              storage.ready
                ? storage.persistent
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                  : 'border-sky-500/35 bg-sky-500/10 text-sky-200'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
            }`}
          >
            <Cloud className="h-3 w-3" />
            <span>{storage.labelFa}</span>
          </span>
        ) : null}
      </div>

      {description ? <p className="text-xs text-[#9297A3]">{description}</p> : null}

      {/* Hidden form input for seamless Server Action form submission */}
      {name ? <input type="hidden" name={name} value={currentUrl} /> : null}

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {storage && !storage.ready && storage.hintFa ? (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
          {storage.hintFa}
        </div>
      ) : null}

      {safePreviewUrl ? (
        <div className="overflow-hidden rounded border border-white/10 bg-[#0d1017]">
          <div className={`relative w-full ${aspectClass} max-h-[280px] overflow-hidden bg-[#08090c]`}>
            <img
              src={safePreviewUrl}
              alt={altText || label}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            {uploading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 p-4 text-white">
                <Loader2 className="h-6 w-6 animate-spin text-[#e10600]" />
                <span className="text-xs font-medium">در حال آپلود تصویر... {progress}%</span>
                <div className="h-1.5 w-44 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full bg-[#e10600] transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 p-3">
            <p className="min-w-0 flex-1 truncate text-xs text-white/55" dir="ltr" title={currentUrl}>
              {currentUrl}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-[#e10600]/60 hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>جایگزینی تصویر</span>
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={handleRemove}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>حذف تصویر</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed px-4 py-7 text-center transition ${
            dragOver
              ? 'border-[#e10600] bg-[#e10600]/10'
              : 'border-white/15 bg-[#0d1017] hover:border-[#e10600]/60 hover:bg-[#131722]'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2.5">
              <Loader2 className="h-7 w-7 animate-spin text-[#e10600]" />
              <p className="text-sm font-semibold text-white">در حال آپلود تصویر... {progress}%</p>
              <div className="h-2 w-48 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-[#e10600] transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#e10600]/35 bg-[#e10600]/12 text-[#e10600]">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">
                تصویر را اینجا بکشید و رها کنید یا برای انتخاب کلیک کنید
              </p>
              <p className="mt-1 text-xs text-[#9297A3]">
                فرمت‌های مجاز: JPG، JPEG، PNG، WEBP — حداکثر حجم ۵ مگابایت (سازگار با موبایل و دسکتاپ)
              </p>
            </>
          )}
        </div>
      )}

      {/* Optional Media Library Picker + Legacy Direct URL Toggle */}
      <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs">
        {mediaLibrary.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowLibrary((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sky-300 hover:underline"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>{showLibrary ? 'بستن کتابخانه رسانه' : 'انتخاب از کتابخانه رسانه'}</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className="inline-flex items-center gap-1.5 text-white/55 hover:text-white"
        >
          <Link2 className="h-3.5 w-3.5" />
          <span>{showUrlInput ? 'مخفی کردن آدرس دستی' : 'وارد کردن آدرس مستقیم تصویر (سازگار با قبل)'}</span>
        </button>
      </div>

      {showLibrary && mediaLibrary.length > 0 ? (
        <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto rounded border border-white/10 bg-[#0b0d13] p-2.5 sm:grid-cols-4">
          {mediaLibrary.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                updateUrl(item.url)
                setShowLibrary(false)
                setUploadError(null)
                setUrlError(null)
              }}
              className={`group overflow-hidden rounded border text-right transition ${
                currentUrl === item.url
                  ? 'border-[#e10600] ring-1 ring-[#e10600]'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-black">
                <img
                  src={item.url}
                  alt={item.altText || item.filename}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="truncate px-1.5 py-1 text-[10px] text-white/70">{item.filename}</p>
            </button>
          ))}
        </div>
      ) : null}

      {showUrlInput ? (
        <input
          type="text"
          dir="ltr"
          className="admin-input text-xs"
          placeholder="https://res.cloudinary.com/... یا /uploads/..."
          value={currentUrl}
          onChange={(e) => handleManualUrlChange(e.target.value)}
        />
      ) : null}

      {uploadError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <span className="font-semibold text-red-100">خطای آپلود تصویر: </span>
            <span>{uploadError}</span>
          </div>
        </div>
      ) : null}

      {activeValidationError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded border border-amber-500/45 bg-amber-500/10 p-2.5 text-xs text-amber-100"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <span className="font-semibold text-amber-50">خطای اعتبارسنجی آدرس تصویر: </span>
            <span>{activeValidationError}</span>
          </div>
        </div>
      ) : null}

      {successMsg ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded border border-emerald-500/35 bg-emerald-500/10 p-2.5 text-xs text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      ) : null}
    </div>
  )
}
