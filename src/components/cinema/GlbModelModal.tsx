'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Box, Play, RotateCcw, Upload, X } from 'lucide-react'
import { useCart } from '@/components/cart/CartProvider'
import type { CharacterAssetMetadata } from './engine/character/types'

type Props = {
  open: boolean
  characterMeta: CharacterAssetMetadata | null
  onClose: () => void
  onLoadGlbFile: (blobUrl: string, fileName: string) => Promise<void>
  onPlayClip: (clipName: string) => void
  onResetDefault: () => void
}

export function GlbModelModal({
  open,
  characterMeta,
  onClose,
  onLoadGlbFile,
  onPlayClip,
  onResetDefault,
}: Props) {
  const { showToast } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastBlobRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    return () => {
      if (lastBlobRef.current) {
        URL.revokeObjectURL(lastBlobRef.current)
      }
    }
  }, [])

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setLoading(true)
    if (lastBlobRef.current) {
      URL.revokeObjectURL(lastBlobRef.current)
    }
    const blobUrl = URL.createObjectURL(file)
    lastBlobRef.current = blobUrl
    try {
      showToast('در حال بارگذاری مدل رسمی MR.ROBOT...')
      await onLoadGlbFile(blobUrl, file.name)
      onClose()
      showToast('مدل مرجع رسمی شما با موفقیت در صحنه استودیویی جایگزین شد')
    } catch {
      setError('خطا در خواندن فایل سه‌بعدی — لطفاً یک فایل معتبر با فرمت .glb یا .gltf انتخاب کنید.')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div
      className={`cinema-modal-overlay ${open ? 'is-open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-labelledby="cinema-glb-modal-title"
    >
      <div className="cinema-modal-box">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-[#38bdf8]">
              معماری ماژولار کاراکتر MR.ROBOT
            </span>
            <h3
              id="cinema-glb-modal-title"
              className="mt-1 text-lg font-extrabold text-white"
            >
              بارگذاری مدل رسمی MR.ROBOT (.glb / .gltf)
            </h3>
          </div>
          <button
            type="button"
            className="cinema-icon-close"
            onClick={onClose}
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-[#a8bad8]">
          این صحنه آماده جایگذاری مستقیم فایل سه‌بعدی ریگ‌شده رسمی{' '}
          <span className="cinema-brand-inline font-semibold text-white">MR.ROBOT</span> با
          پشتیبانی از <span dir="ltr">AnimationMixer</span>، متریال‌های PBR و ردیابی نگاه است —
          بدون نیاز به بازسازی نورپردازی یا دوربین.
        </p>

        {characterMeta ? (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-[#7ea8ff]/20 bg-[#0b162e]/80 px-3.5 py-2.5 text-xs">
            <span className="inline-flex items-center gap-2 text-[#a8bad8]">
              <Box className="h-4 w-4 text-[#38bdf8]" />
              مدل فعال فعلی:
            </span>
            <span className="font-semibold text-white">{characterMeta.sourceLabel}</span>
          </div>
        ) : null}

        <label className="cinema-dropzone" htmlFor="cinema-glb-file-input">
          <Upload className="mx-auto mb-2 h-6 w-6 text-[#38bdf8]" />
          <strong className="mb-1 block text-sm text-white">
            {loading ? 'در حال پردازش و همگام‌سازی مدل...' : 'انتخاب فایل مدل سه‌بعدی مرجع (.glb / .gltf)'}
          </strong>
          <span className="block text-xs text-[#7c92b8]">
            مقیاس‌بندی، مرکزچینی، سایه‌ها و انیمیشن‌های اسکلتی به‌صورت خودکار اعمال می‌شوند
          </span>
          <input
            type="file"
            id="cinema-glb-file-input"
            accept=".glb,.gltf"
            disabled={loading}
            onChange={handleFileChange}
            hidden
          />
        </label>

        {characterMeta && characterMeta.animationClips.length > 0 ? (
          <div className="mb-4 rounded-xl border border-[#7ea8ff]/20 bg-[#071127] p-3">
            <p className="mb-2 text-xs font-semibold text-[#38bdf8]">
              انیمیشن‌های اسکلتی شناسایی‌شده (AnimationMixer):
            </p>
            <div className="flex flex-wrap gap-2">
              {characterMeta.animationClips.map((clip) => (
                <button
                  key={clip}
                  type="button"
                  onClick={() => onPlayClip(clip)}
                  className={`cinema-plan-pill inline-flex items-center gap-1.5 ${
                    characterMeta.activeClip === clip ? 'is-active' : ''
                  }`}
                >
                  <Play className="h-3 w-3" />
                  <span dir="ltr">{clip}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mb-3 rounded-lg border border-[#ef1d42]/40 bg-[#ef1d42]/10 px-3 py-2 text-xs text-[#fecdd3]">
            {error}
          </p>
        ) : null}

        <div className="cinema-cta-group justify-between">
          <button
            type="button"
            onClick={() => {
              onResetDefault()
              showToast('کاراکتر مرجع استودیویی پیش‌فرض فعال شد')
            }}
            className="cinema-btn cinema-btn-subtle cinema-btn-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>بازگشت به کاراکتر مرجع پیش‌فرض</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cinema-btn cinema-btn-buy cinema-btn-sm"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  )
}
