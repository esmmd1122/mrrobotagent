import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { isProductionRuntime } from '@/lib/env/production'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function validateImage(file: File, maxBytes = 2 * 1024 * 1024) {
  if (!ALLOWED.has(file.type)) throw new Error('INVALID_IMAGE')
  if (file.size > maxBytes) throw new Error('IMAGE_TOO_LARGE')
}

export async function storeImage(file: File, prefix: string, maxBytes = 2 * 1024 * 1024) {
  validateImage(file, maxBytes)
  const bytes = Buffer.from(await file.arrayBuffer())
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'jpg'
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`
  if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    })
    await client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: file.type,
    }))
    const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, '')
    if (!base) throw new Error('S3_PUBLIC_BASE_URL')
    return `${base}/${key}`
  }
  if (isProductionRuntime()) throw new Error('PERSISTENT_STORAGE_REQUIRED')
  const relative = path.join('uploads', key)
  const target = path.join(process.cwd(), 'public', relative)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, bytes)
  return `/${relative.replaceAll('\\', '/')}`
}
