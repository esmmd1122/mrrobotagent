import { createHash } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { isProductionRuntime } from '@/lib/env/production'
import {
  DEFAULT_MAX_IMAGE_BYTES,
  normalizeAndValidateProductImageUrl,
  resolveStorageProviderStatus,
  sanitizeUploadFolder,
  validateImagePayload,
  type AllowedImageMime,
  type StorageProviderStatus,
} from '@/lib/storage-validation'

export {
  ALLOWED_PRODUCT_IMAGE_MIMES,
  DEFAULT_MAX_IMAGE_BYTES,
  isSafeImageUrl,
  normalizeAndValidateProductImageUrl,
  sanitizeUploadFolder,
  validateImagePayload,
} from '@/lib/storage-validation'

export function getStorageProviderStatus(): StorageProviderStatus {
  return resolveStorageProviderStatus(process.env, isProductionRuntime())
}

export function validateImage(file: File, maxBytes = DEFAULT_MAX_IMAGE_BYTES) {
  const raw = file.type.toLowerCase().trim()
  const normalized = raw === 'image/jpg' ? 'image/jpeg' : raw
  if (normalized !== 'image/jpeg' && normalized !== 'image/png' && normalized !== 'image/webp') {
    throw new Error('INVALID_IMAGE')
  }
  if (file.size <= 0) throw new Error('EMPTY_IMAGE')
  if (file.size > maxBytes) throw new Error('IMAGE_TOO_LARGE')
}

async function uploadToS3(bytes: Buffer, key: string, mime: AllowedImageMime): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const bucket = process.env.S3_BUCKET?.trim()
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim()
  const base = process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/$/, '')
  if (!bucket || !accessKeyId || !secretAccessKey || !base) {
    throw new Error('S3_PUBLIC_BASE_URL')
  }

  const client = new S3Client({
    region: process.env.S3_REGION?.trim() || 'auto',
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: Boolean(process.env.S3_ENDPOINT?.trim()),
  })
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  return `${base}/${key}`
}

export type SafeCloudinaryDiagnostics = {
  activeProvider: StorageProviderStatus['provider']
  hasCloudName: boolean
  hasApiKey: boolean
  hasApiSecret: boolean
  hasCloudinaryUrlVar: boolean
  hasCompleteS3: boolean
  cloudNameHadPaddingOrQuotes: boolean
  apiKeyHadPaddingOrQuotes: boolean
  apiSecretHadPaddingOrQuotes: boolean
}

function hadPaddingOrQuotes(raw: string | undefined): boolean {
  if (!raw) return false
  const trimmed = raw.trim()
  if (trimmed !== raw) return true
  return (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  )
}

/**
 * Returns strictly non-secret boolean diagnostics for server logs.
 * Never exposes credential values, prefixes, lengths, or CLOUDINARY_URL contents.
 */
export function getSafeCloudinaryDiagnostics(
  env: NodeJS.ProcessEnv = process.env,
): SafeCloudinaryDiagnostics {
  const status = resolveStorageProviderStatus(env, isProductionRuntime())
  const hasCompleteS3 = Boolean(
    env.S3_BUCKET?.trim() &&
      env.S3_ACCESS_KEY_ID?.trim() &&
      env.S3_SECRET_ACCESS_KEY?.trim() &&
      env.S3_PUBLIC_BASE_URL?.trim(),
  )
  return {
    activeProvider: status.provider,
    hasCloudName: Boolean(env.CLOUDINARY_CLOUD_NAME?.trim()),
    hasApiKey: Boolean(env.CLOUDINARY_API_KEY?.trim()),
    hasApiSecret: Boolean(env.CLOUDINARY_API_SECRET?.trim()),
    hasCloudinaryUrlVar: Boolean(env.CLOUDINARY_URL?.trim()),
    hasCompleteS3,
    cloudNameHadPaddingOrQuotes: hadPaddingOrQuotes(env.CLOUDINARY_CLOUD_NAME),
    apiKeyHadPaddingOrQuotes: hadPaddingOrQuotes(env.CLOUDINARY_API_KEY),
    apiSecretHadPaddingOrQuotes: hadPaddingOrQuotes(env.CLOUDINARY_API_SECRET),
  }
}

function sanitizeProviderErrorText(
  raw: string | null | undefined,
  secrets: string[],
): string {
  if (!raw) return ''
  let text = raw.replace(/[\r\n\t]+/g, ' ').trim()
  for (const secret of secrets) {
    if (secret && secret.length >= 4) {
      text = text.split(secret).join('[REDACTED]')
    }
  }
  return text.slice(0, 220)
}

const CLOUDINARY_PERMISSION_MSG_RE =
  /\b(not allowed|insufficient permissions?|permission denied|forbidden|access denied)\b/i

export async function uploadToCloudinary(
  bytes: Buffer,
  folder: string,
  mime: AllowedImageMime,
  ext: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim() || ''
  const apiKey = env.CLOUDINARY_API_KEY?.trim() || ''
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim() || ''
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('PERSISTENT_STORAGE_REQUIRED')
  }

  const timestamp = String(Math.floor(Date.now() / 1000))
  const cloudFolder = `mr-robot/${folder}`
  const publicId = crypto.randomUUID()

  // Signed Cloudinary upload (alphabetical parameter signing)
  const paramsToSign = `folder=${cloudFolder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
  const signature = createHash('sha1').update(paramsToSign).digest('hex')

  const form = new FormData()
  form.append(
    'file',
    new Blob([new Uint8Array(bytes)], { type: mime }),
    `${publicId}.${ext}`,
  )
  form.append('api_key', apiKey)
  form.append('timestamp', timestamp)
  form.append('folder', cloudFolder)
  form.append('public_id', publicId)
  form.append('signature', signature)

  let res: Response
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: 'POST',
      body: form,
    })
  } catch {
    throw new Error('CLOUDINARY_NETWORK_FAILED')
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    const secretsToRedact = [apiKey, apiSecret, signature]
    const providerMessage = sanitizeProviderErrorText(errBody?.error?.message, secretsToRedact)
    const cldError = sanitizeProviderErrorText(res.headers.get('x-cld-error'), secretsToRedact)
    const combinedReason = `${providerMessage} ${cldError}`.trim()

    console.error('[storage/cloudinary] upload failed', {
      status: res.status,
      cldError: cldError || null,
      providerMessage: providerMessage || null,
      folder: cloudFolder,
      diagnostics: getSafeCloudinaryDiagnostics(env),
    })

    if (res.status === 403) {
      throw new Error('CLOUDINARY_PERMISSION_DENIED')
    }
    if (res.status === 401) {
      if (CLOUDINARY_PERMISSION_MSG_RE.test(combinedReason)) {
        throw new Error('CLOUDINARY_PERMISSION_DENIED')
      }
      throw new Error('CLOUDINARY_AUTH_FAILED')
    }
    if (res.status === 404) {
      throw new Error('CLOUDINARY_CLOUD_NOT_FOUND')
    }
    throw new Error('CLOUDINARY_UPLOAD_FAILED')
  }

  const data = (await res.json().catch(() => null)) as { secure_url?: string } | null
  const rawSecureUrl = typeof data?.secure_url === 'string' ? data.secure_url.trim() : ''
  if (!rawSecureUrl) {
    throw new Error('CLOUDINARY_INVALID_URL')
  }

  const validated = normalizeAndValidateProductImageUrl(rawSecureUrl, {
    cloudinaryCloudName: cloudName,
    strictCloudinaryCloudMatch: true,
  })
  if (!validated.ok || !validated.url || validated.source !== 'cloudinary') {
    throw new Error('CLOUDINARY_INVALID_URL')
  }

  return validated.url
}

export async function storeImageWithMeta(
  file: File,
  prefix: string,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
): Promise<{ url: string; mime: AllowedImageMime; ext: 'jpg' | 'png' | 'webp' }> {
  const bytes = Buffer.from(await file.arrayBuffer())
  const validation = validateImagePayload({
    declaredMime: file.type,
    sizeBytes: file.size,
    bytes,
    maxBytes,
  })

  if (!validation.ok) {
    throw new Error(validation.code)
  }

  const safeFolder = sanitizeUploadFolder(prefix)
  const key = `${safeFolder}/${crypto.randomUUID()}.${validation.ext}`

  // 1. Existing S3-compatible persistent object storage (must match resolveStorageProviderStatus)
  if (
    process.env.S3_BUCKET?.trim() &&
    process.env.S3_ACCESS_KEY_ID?.trim() &&
    process.env.S3_SECRET_ACCESS_KEY?.trim() &&
    process.env.S3_PUBLIC_BASE_URL?.trim()
  ) {
    const url = await uploadToS3(bytes, key, validation.mime)
    return { url, mime: validation.mime, ext: validation.ext }
  }

  // 2. Cloudinary persistent storage
  if (
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim()
  ) {
    const url = await uploadToCloudinary(bytes, safeFolder, validation.mime, validation.ext)
    return { url, mime: validation.mime, ext: validation.ext }
  }

  // 3. Strictly refuse non-persistent local writes in production (Vercel)
  if (isProductionRuntime()) {
    throw new Error('PERSISTENT_STORAGE_REQUIRED')
  }

  // 4. Local development filesystem (confined strictly inside public/uploads)
  const baseDir = path.resolve(process.cwd(), 'public', 'uploads')
  const target = path.resolve(baseDir, key)
  if (!target.startsWith(baseDir + path.sep)) {
    throw new Error('INVALID_UPLOAD_PATH')
  }
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, bytes)
  return {
    url: `/uploads/${key.replaceAll('\\', '/')}`,
    mime: validation.mime,
    ext: validation.ext,
  }
}

export async function storeImage(
  file: File,
  prefix: string,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
): Promise<string> {
  const stored = await storeImageWithMeta(file, prefix, maxBytes)
  return stored.url
}
