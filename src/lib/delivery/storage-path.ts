import path from 'path'

export const PRIVATE_DELIVERY_PREFIX = 'private:'
export const PRIVATE_S3_PREFIX = 'private:s3:'

/** S3 object key for fulfillment blobs stored with private ACL (no public URL in DB). */
export function parsePrivateS3Key(storedUrl: string): string | null {
  if (!storedUrl.startsWith(PRIVATE_S3_PREFIX)) return null
  const key = storedUrl.slice(PRIVATE_S3_PREFIX.length).replace(/^\//, '')
  return key || null
}

/** Resolve delivery file URL from DB to absolute filesystem path (not web-accessible). */
export function resolvePrivateDeliveryPath(storedUrl: string): string | null {
  if (!storedUrl.startsWith(PRIVATE_DELIVERY_PREFIX)) return null
  if (storedUrl.startsWith(PRIVATE_S3_PREFIX)) return null
  const relative = storedUrl.slice(PRIVATE_DELIVERY_PREFIX.length).replace(/^\//, '')
  return path.join(process.cwd(), 'data', 'private', relative)
}

/** Legacy rows may still reference /uploads/... until migrate:fulfillment-files runs. */
export function resolveQuarantinedLegacyUploadPath(storedUrl: string): string | null {
  const normalized = storedUrl.replace(/^\//, '')
  if (!normalized.startsWith('uploads/')) return null
  const quarantineRel = `quarantine/${normalized}`
  return path.join(process.cwd(), 'data', 'private', quarantineRel)
}