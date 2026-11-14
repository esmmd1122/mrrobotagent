import { readFile } from 'fs/promises'
import path from 'path'
import {
  parsePrivateS3Key,
  resolvePrivateDeliveryPath,
  resolveQuarantinedLegacyUploadPath,
} from './storage-path'

function fileMimeFromPath(p: string) {
  if (p.endsWith('.pdf')) return 'application/pdf'
  if (p.endsWith('.zip')) return 'application/zip'
  if (p.endsWith('.png')) return 'image/png'
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg'
  if (p.endsWith('.webp')) return 'image/webp'
  if (p.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

async function readFromPrivateS3(key: string) {
  if (!process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error('S3_NOT_CONFIGURED')
  }
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  })
  const out = await client.send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    }),
  )
  if (!out.Body) throw new Error('S3_EMPTY_BODY')
  const bytes = Buffer.from(await out.Body.transformToByteArray())
  return {
    bytes,
    mimeType: out.ContentType || fileMimeFromPath(key),
  }
}

/** Read fulfillment bytes only from private storage (never direct public HTTP URLs). */
export async function readFulfillmentStoredBytes(storedUrl: string) {
  const s3Key = parsePrivateS3Key(storedUrl)
  if (s3Key) return readFromPrivateS3(s3Key)

  if (storedUrl.startsWith('http://') || storedUrl.startsWith('https://')) {
    throw new Error('PUBLIC_URL_BLOCKED')
  }

  const privatePath = resolvePrivateDeliveryPath(storedUrl)
  if (privatePath) {
    const bytes = await readFile(privatePath)
    return { bytes, mimeType: fileMimeFromPath(privatePath) }
  }

  const quarantined = resolveQuarantinedLegacyUploadPath(storedUrl)
  if (quarantined) {
    const bytes = await readFile(quarantined)
    return { bytes, mimeType: fileMimeFromPath(quarantined) }
  }

  const relative = storedUrl.replace(/^\//, '')
  if (relative.startsWith('uploads/')) {
    throw new Error('LEGACY_UPLOAD_NEEDS_MIGRATION')
  }

  const legacyPublic = path.join(process.cwd(), 'public', relative)
  throw new Error(`UNSAFE_STORED_URL:${relative}`)
}