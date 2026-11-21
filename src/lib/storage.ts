import { createHash } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { isProductionRuntime } from '@/lib/env/production'
import {
  DEFAULT_MAX_IMAGE_BYTES,
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
  sanitizeUploadFolder,
  validateImagePayload,
} from '@/lib/storage-validation'

export function getStorageProviderStatus(): StorageProviderStatus {
  return resolveStorageProviderStatus(process.env, isProductionRuntime())
}

export function validateImage(file: File, maxBytes = DEFAULT_MAX_IMAGE_BYTES) {
  const normalized = file.type.toLowerCase().trim()
  if (normalized !== 'image/jpeg' && normalized !== 'image/png' && normalized !== 'image/webp') {
    throw new Error('INVALID_IMAGE')
  }
  if (file.size <= 0) throw new Error('EMPTY_IMAGE')
  if (file.size > maxBytes) throw new Error('IMAGE_TOO_LARGE')
}

async function uploadToS3(bytes: Buffer, key: string, mime: AllowedImageMime): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  })
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: bytes,
      ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, '')
  if (!base) throw new Error('S3_PUBLIC_BASE_URL')
  return `${base}/${key}`
}

async function uploadToCloudinary(
  bytes: Buffer,
  folder: string,
  mime: AllowedImageMime,
  ext: string,
): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!
  const apiKey = process.env.CLOUDINARY_API_KEY!
  const apiSecret = process.env.CLOUDINARY_API_SECRET!
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

  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    throw new Error('CLOUDINARY_UPLOAD_FAILED')
  }
  const data = (await res.json()) as { secure_url?: string }
  if (!data.secure_url) {
    throw new Error('CLOUDINARY_UPLOAD_FAILED')
  }
  return data.secure_url
}

export async function storeImage(
  file: File,
  prefix: string,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
): Promise<string> {
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

  // 1. Existing S3-compatible persistent object storage (Cloudflare R2 / AWS S3 / Arvan / MinIO)
  if (
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  ) {
    return uploadToS3(bytes, key, validation.mime)
  }

  // 2. Optional Cloudinary persistent storage
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    return uploadToCloudinary(bytes, safeFolder, validation.mime, validation.ext)
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
  return `/uploads/${key.replaceAll('\\', '/')}`
}
