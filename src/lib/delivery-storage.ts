import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { isProductionRuntime } from '@/lib/env/production'
import { PRIVATE_DELIVERY_PREFIX, PRIVATE_S3_PREFIX } from '@/lib/delivery/storage-path'

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/zip',
  'text/plain',
])

const MAX_BYTES = 10 * 1024 * 1024

export function validateDeliveryFile(file: File) {
  if (!ALLOWED.has(file.type)) throw new Error('INVALID_FILE_TYPE')
  if (file.size > MAX_BYTES) throw new Error('FILE_TOO_LARGE')
  if (file.size <= 0) throw new Error('EMPTY_FILE')
}

export async function storeDeliveryFile(file: File, orderId: string) {
  validateDeliveryFile(file)
  const bytes = Buffer.from(await file.arrayBuffer())
  const extByMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'text/plain': 'txt',
  }
  const ext = extByMime[file.type] || 'bin'
  const key = `fulfillment/${orderId}/${crypto.randomUUID()}.${ext}`

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
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: file.type,
      }),
    )
    return {
      url: `${PRIVATE_S3_PREFIX}${key}`,
      mimeType: file.type,
      sizeBytes: file.size,
      filename: file.name,
    }
  }

  if (isProductionRuntime()) throw new Error('PERSISTENT_STORAGE_REQUIRED')

  const target = path.join(process.cwd(), 'data', 'private', key)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, bytes)
  return {
    url: `${PRIVATE_DELIVERY_PREFIX}${key.replaceAll('\\', '/')}`,
    mimeType: file.type,
    sizeBytes: file.size,
    filename: file.name,
  }
}