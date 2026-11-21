export type AllowedImageMime = 'image/jpeg' | 'image/png' | 'image/webp'

export const ALLOWED_PRODUCT_IMAGE_MIMES: readonly AllowedImageMime[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

export type StorageProviderKind = 's3' | 'cloudinary' | 'local-dev' | 'unconfigured-prod'

export type StorageProviderStatus = {
  provider: StorageProviderKind
  ready: boolean
  persistent: boolean
  labelFa: string
  hintFa?: string
}

/**
 * Inspects binary magic bytes to verify the true image format server-side.
 * Prevents MIME spoofing (e.g., HTML/SVG/JS renamed to .jpg).
 */
export function detectImageMimeFromBytes(bytes: Uint8Array): AllowedImageMime | null {
  if (bytes.length < 12) return null

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}

export function extensionForImageMime(mime: AllowedImageMime): 'jpg' | 'png' | 'webp' {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

export function validateImagePayload(params: {
  declaredMime: string
  sizeBytes: number
  bytes: Uint8Array
  maxBytes?: number
}): { ok: true; mime: AllowedImageMime; ext: 'jpg' | 'png' | 'webp' } | { ok: false; code: 'INVALID_IMAGE' | 'IMAGE_TOO_LARGE' | 'EMPTY_IMAGE'; messageFa: string } {
  const maxBytes = params.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES

  if (params.sizeBytes <= 0 || params.bytes.length === 0) {
    return {
      ok: false,
      code: 'EMPTY_IMAGE',
      messageFa: 'فایل انتخاب‌شده خالی است.',
    }
  }

  if (params.sizeBytes > maxBytes || params.bytes.length > maxBytes) {
    const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10
    return {
      ok: false,
      code: 'IMAGE_TOO_LARGE',
      messageFa: `حجم تصویر نباید بیشتر از ${maxMb} مگابایت باشد.`,
    }
  }

  const normalizedDeclared = params.declaredMime.toLowerCase().trim()
  if (!ALLOWED_PRODUCT_IMAGE_MIMES.includes(normalizedDeclared as AllowedImageMime)) {
    return {
      ok: false,
      code: 'INVALID_IMAGE',
      messageFa: 'فقط فرمت‌های تصویری JPG، JPEG، PNG و WEBP مجاز هستند.',
    }
  }

  const detected = detectImageMimeFromBytes(params.bytes)
  if (!detected || detected !== normalizedDeclared) {
    return {
      ok: false,
      code: 'INVALID_IMAGE',
      messageFa: 'محتوای فایل با فرمت تصویر معتبر (JPG، PNG یا WEBP) مطابقت ندارد.',
    }
  }

  return {
    ok: true,
    mime: detected,
    ext: extensionForImageMime(detected),
  }
}

const STATIC_FOLDERS = new Set(['products', 'banners', 'sections', 'media'])

/**
 * Restricts upload destination folders to safe allowlisted prefixes.
 */
export function sanitizeUploadFolder(rawFolder: string | null | undefined): string {
  const cleaned = String(rawFolder || 'media')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')

  if (STATIC_FOLDERS.has(cleaned)) return cleaned

  // Preserve legacy salon/<uuid> prefix for studio uploads
  if (/^salon\/[a-z0-9-]{8,64}$/.test(cleaned)) {
    return cleaned
  }

  return 'media'
}

/**
 * Validates that an image URL is safe to persist and render (blocks javascript:/data:/vbscript:).
 */
export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return true
  const trimmed = url.trim()
  if (!trimmed) return true
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Reports active storage backend cleanly without exposing secrets.
 */
export function resolveStorageProviderStatus(
  env: NodeJS.ProcessEnv = process.env,
  isProd = false,
): StorageProviderStatus {
  const hasS3 = Boolean(
    env.S3_BUCKET &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY &&
      env.S3_PUBLIC_BASE_URL,
  )
  if (hasS3) {
    return {
      provider: 's3',
      ready: true,
      persistent: true,
      labelFa: 'فضای ابری S3 / R2 (ماندگار)',
    }
  }

  const hasCloudinary = Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  )
  if (hasCloudinary) {
    return {
      provider: 'cloudinary',
      ready: true,
      persistent: true,
      labelFa: 'Cloudinary (ماندگار)',
    }
  }

  if (isProd) {
    return {
      provider: 'unconfigured-prod',
      ready: false,
      persistent: false,
      labelFa: 'فضای ذخیره‌سازی ماندگار تنظیم نشده',
      hintFa:
        'در محیط تولید، متغیرهای فضای ابری S3/R2 (S3_BUCKET، S3_ACCESS_KEY_ID، S3_SECRET_ACCESS_KEY، S3_PUBLIC_BASE_URL) یا Cloudinary باید روی سرور تنظیم شوند.',
    }
  }

  return {
    provider: 'local-dev',
    ready: true,
    persistent: false,
    labelFa: 'ذخیره‌سازی محلی توسعه (Local Dev)',
    hintFa:
      'برای محیط تولید روی Vercel، اتصال S3/R2 یا Cloudinary را از طریق متغیرهای محیطی فعال کنید.',
  }
}
