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

  const rawDeclared = params.declaredMime.toLowerCase().trim()
  const normalizedDeclared = rawDeclared === 'image/jpg' ? 'image/jpeg' : rawDeclared

  if (
    normalizedDeclared !== '' &&
    !ALLOWED_PRODUCT_IMAGE_MIMES.includes(normalizedDeclared as AllowedImageMime)
  ) {
    return {
      ok: false,
      code: 'INVALID_IMAGE',
      messageFa: 'فقط فرمت‌های تصویری JPG، JPEG، PNG و WEBP مجاز هستند.',
    }
  }

  const detected = detectImageMimeFromBytes(params.bytes)
  if (!detected || (normalizedDeclared !== '' && detected !== normalizedDeclared)) {
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

const INVISIBLE_URL_CHARS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g
const ASCII_CONTROL_OR_SPACE = /[\u0000-\u001F\u007F\s]/
const CLOUDINARY_HOST_RE = /^(?:res(?:-\d+)?\.cloudinary\.com)$/i
const LEGACY_RELATIVE_PREFIX_RE = /^(?:uploads|images|assets)\/[a-zA-Z0-9._\-/%]+$/

export type ImageUrlSource = 'empty' | 'relative' | 'cloudinary' | 's3' | 'https' | 'legacy-http'

export type ImageUrlValidationErrorCode =
  | 'MALFORMED_URL'
  | 'INVALID_PROTOCOL'
  | 'UNSAFE_HOST'
  | 'INVALID_CLOUDINARY_ACCOUNT'

export type ImageUrlValidationResult =
  | { ok: true; url: string | null; source: ImageUrlSource }
  | { ok: false; code: ImageUrlValidationErrorCode; messageFa: string }

function stripInvisibleAndOuterQuotes(raw: string): string {
  let cleaned = raw.replace(INVISIBLE_URL_CHARS, '').trim()
  if (
    cleaned.length >= 2 &&
    ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'")))
  ) {
    cleaned = cleaned.slice(1, -1).replace(INVISIBLE_URL_CHARS, '').trim()
  }
  return cleaned
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return true
  }
  if (host === '::1' || host === '0:0:0:0:0:0:0:1' || host === '0.0.0.0') {
    return true
  }
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) {
    return true
  }
  // IPv4 private / loopback / link-local ranges
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (ipv4Match) {
    const [a, b] = [Number(ipv4Match[1]), Number(ipv4Match[2])]
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 100 && b >= 64 && b <= 127) return true
  }
  // Must have a dot for public DNS hostname (blocks bare intranet names)
  if (!host.includes('.')) return true
  return false
}

export function isCloudinaryHostname(hostname: string): boolean {
  return CLOUDINARY_HOST_RE.test(hostname.trim())
}

/**
 * Normalizes and validates a product/CMS image URL.
 * - Strips invisible RTL/LTR bidi marks & BOM characters frequently introduced by copy-paste in RTL UIs.
 * - Validates trusted HTTPS Cloudinary `secure_url` values against the configured cloud name when present.
 * - Preserves backward compatibility for legacy relative `/uploads/...`, `uploads/...`, S3, and public HTTPS/HTTP image URLs.
 * - Blocks `javascript:`, `data:`, `blob:`, `file:`, arbitrary protocol-relative URLs, credentialed URLs, and private/loopback hosts.
 */
export function normalizeAndValidateProductImageUrl(
  rawUrl: string | null | undefined,
  options?: {
    cloudinaryCloudName?: string | null
    strictCloudinaryCloudMatch?: boolean
    s3PublicBaseUrl?: string | null
    legacyExistingUrl?: string | null
  },
): ImageUrlValidationResult {
  if (!rawUrl) return { ok: true, url: null, source: 'empty' }
  const cleaned = stripInvisibleAndOuterQuotes(rawUrl)
  if (!cleaned) return { ok: true, url: null, source: 'empty' }

  if (ASCII_CONTROL_OR_SPACE.test(cleaned)) {
    return {
      ok: false,
      code: 'MALFORMED_URL',
      messageFa: 'آدرس تصویر محصول نباید شامل فاصله یا کاراکتر نامعتبر باشد.',
    }
  }

  // Safe local/relative paths (e.g. /uploads/products/..., /assets/...)
  if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
    if (cleaned.includes('\\') || /(?:^|\/)\.\.(?:\/|$)/.test(cleaned)) {
      return {
        ok: false,
        code: 'MALFORMED_URL',
        messageFa: 'مسیر داخلی تصویر محصول نامعتبر است.',
      }
    }
    return { ok: true, url: cleaned, source: 'relative' }
  }

  // Legacy relative paths saved without leading slash (uploads/..., images/..., assets/...)
  if (LEGACY_RELATIVE_PREFIX_RE.test(cleaned) && !/(?:^|\/)\.\.(?:\/|$)/.test(cleaned)) {
    return { ok: true, url: `/${cleaned}`, source: 'relative' }
  }

  // Upgrade protocol-relative or scheme-omitted Cloudinary URLs safely to HTTPS;
  // arbitrary protocol-relative URLs like `//evil.example/x.png` remain rejected.
  let candidate = cleaned
  if (/^\/\/res(?:-\d+)?\.cloudinary\.com\//i.test(candidate)) {
    candidate = `https:${candidate}`
  } else if (/^res(?:-\d+)?\.cloudinary\.com\//i.test(candidate)) {
    candidate = `https://${candidate}`
  } else if (candidate.startsWith('//')) {
    return {
      ok: false,
      code: 'MALFORMED_URL',
      messageFa: 'آدرس تصویر باید با https:// یا مسیر داخلی / شروع شود.',
    }
  }

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return {
      ok: false,
      code: 'MALFORMED_URL',
      messageFa: 'فرمت آدرس تصویر محصول معتبر نیست. تصویر را آپلود کنید یا آدرس کامل https:// وارد نمایید.',
    }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      ok: false,
      code: 'INVALID_PROTOCOL',
      messageFa: 'فقط آدرس‌های اینترنتی معتبر با پروتکل HTTPS برای تصویر محصول مجاز هستند.',
    }
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      code: 'UNSAFE_HOST',
      messageFa: 'آدرس تصویر محصول نباید شامل نام کاربری یا رمز عبور باشد.',
    }
  }

  if (isBlockedHost(parsed.hostname)) {
    return {
      ok: false,
      code: 'UNSAFE_HOST',
      messageFa: 'دامنه آدرس تصویر محصول معتبر یا مجاز نیست.',
    }
  }

  // Cloudinary URL validation
  if (isCloudinaryHostname(parsed.hostname)) {
    // Always enforce HTTPS for Cloudinary delivery URLs
    parsed.protocol = 'https:'
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments.length < 3 || segments.some((s) => s === '..')) {
      return {
        ok: false,
        code: 'MALFORMED_URL',
        messageFa: 'آدرس تصویر Cloudinary کامل نیست.',
      }
    }

    const expectedCloud = options?.cloudinaryCloudName?.trim()
    const normalizedExisting = options?.legacyExistingUrl
      ? stripInvisibleAndOuterQuotes(options.legacyExistingUrl)
      : null
    const isUnchangedLegacy =
      Boolean(normalizedExisting) &&
      (normalizedExisting === cleaned || normalizedExisting === parsed.toString())

    if (expectedCloud && !isUnchangedLegacy) {
      let urlCloud = ''
      try {
        urlCloud = decodeURIComponent(segments[0]).trim()
      } catch {
        return {
          ok: false,
          code: 'MALFORMED_URL',
          messageFa: 'فرمت آدرس تصویر Cloudinary معتبر نیست.',
        }
      }
      if (urlCloud.toLowerCase() !== expectedCloud.toLowerCase()) {
        return {
          ok: false,
          code: 'INVALID_CLOUDINARY_ACCOUNT',
          messageFa: 'آدرس تصویر Cloudinary با حساب ذخیره‌سازی پیکربندی‌شده روی سرور مطابقت ندارد.',
        }
      }
    }

    if (options?.strictCloudinaryCloudMatch && !expectedCloud) {
      return {
        ok: false,
        code: 'INVALID_CLOUDINARY_ACCOUNT',
        messageFa: 'نام حساب Cloudinary روی سرور تنظیم نشده است.',
      }
    }

    return { ok: true, url: parsed.toString(), source: 'cloudinary' }
  }

  // Optional configured S3/R2 public base URL match
  const s3Base = options?.s3PublicBaseUrl?.trim()
  if (s3Base) {
    try {
      const parsedS3 = new URL(s3Base)
      if (parsed.origin === parsedS3.origin) {
        return { ok: true, url: parsed.toString(), source: 's3' }
      }
    } catch {
      // ignore invalid optional S3_PUBLIC_BASE_URL
    }
  }

  return {
    ok: true,
    url: parsed.toString(),
    source: parsed.protocol === 'https:' ? 'https' : 'legacy-http',
  }
}

/**
 * Validates that an image URL is safe to persist and render (blocks javascript:/data:/vbscript:/private hosts).
 */
export function isSafeImageUrl(
  url: string | null | undefined,
  options?: {
    cloudinaryCloudName?: string | null
    s3PublicBaseUrl?: string | null
    legacyExistingUrl?: string | null
  },
): boolean {
  return normalizeAndValidateProductImageUrl(url, options).ok
}

/**
 * Reports active storage backend cleanly without exposing secrets.
 */
export function resolveStorageProviderStatus(
  env: NodeJS.ProcessEnv = process.env,
  isProd = false,
): StorageProviderStatus {
  const hasS3 = Boolean(
    env.S3_BUCKET?.trim() &&
      env.S3_ACCESS_KEY_ID?.trim() &&
      env.S3_SECRET_ACCESS_KEY?.trim() &&
      env.S3_PUBLIC_BASE_URL?.trim(),
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
    env.CLOUDINARY_CLOUD_NAME?.trim() &&
      env.CLOUDINARY_API_KEY?.trim() &&
      env.CLOUDINARY_API_SECRET?.trim(),
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
