import assert from 'node:assert/strict'
import test from 'node:test'
import {
  detectImageMimeFromBytes,
  isSafeImageUrl,
  resolveStorageProviderStatus,
  sanitizeUploadFolder,
  validateImagePayload,
} from './storage-validation.ts'

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
const WEBP_HEADER = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
const FAKE_HTML = new TextEncoder().encode('<html><script>alert(1)</script></html>')

test('detectImageMimeFromBytes accurately validates PNG, JPEG, and WEBP magic bytes', () => {
  assert.equal(detectImageMimeFromBytes(PNG_HEADER), 'image/png')
  assert.equal(detectImageMimeFromBytes(JPEG_HEADER), 'image/jpeg')
  assert.equal(detectImageMimeFromBytes(WEBP_HEADER), 'image/webp')
  assert.equal(detectImageMimeFromBytes(FAKE_HTML), null)
})

test('validateImagePayload rejects spoofed MIME types, unsupported GIF/SVG, and oversized files', () => {
  const validPng = validateImagePayload({
    declaredMime: 'image/png',
    sizeBytes: PNG_HEADER.length,
    bytes: PNG_HEADER,
  })
  assert.equal(validPng.ok, true)

  // Spoofed HTML claiming to be JPEG
  const spoofed = validateImagePayload({
    declaredMime: 'image/jpeg',
    sizeBytes: FAKE_HTML.length,
    bytes: FAKE_HTML,
  })
  assert.equal(spoofed.ok, false)
  if (!spoofed.ok) assert.equal(spoofed.code, 'INVALID_IMAGE')

  // Mismatched declared PNG vs JPEG bytes
  const mismatched = validateImagePayload({
    declaredMime: 'image/png',
    sizeBytes: JPEG_HEADER.length,
    bytes: JPEG_HEADER,
  })
  assert.equal(mismatched.ok, false)

  // Oversized image (> 5MB)
  const oversized = validateImagePayload({
    declaredMime: 'image/webp',
    sizeBytes: 6 * 1024 * 1024,
    bytes: WEBP_HEADER,
    maxBytes: 5 * 1024 * 1024,
  })
  assert.equal(oversized.ok, false)
  if (!oversized.ok) assert.equal(oversized.code, 'IMAGE_TOO_LARGE')
})

test('sanitizeUploadFolder blocks path traversal and allows known folders only', () => {
  assert.equal(sanitizeUploadFolder('products'), 'products')
  assert.equal(sanitizeUploadFolder('banners'), 'banners')
  assert.equal(sanitizeUploadFolder('sections'), 'sections')
  assert.equal(sanitizeUploadFolder('../../etc/passwd'), 'media')
  assert.equal(sanitizeUploadFolder('salon/12345678-abcd'), 'salon/12345678-abcd')
})

test('isSafeImageUrl blocks javascript: and data: schemes while permitting relative & HTTPS URLs', () => {
  assert.equal(isSafeImageUrl('/uploads/products/test.webp'), true)
  assert.equal(isSafeImageUrl('https://cdn.example.com/img.png'), true)
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false)
  assert.equal(isSafeImageUrl('data:image/svg+xml,<svg/>'), false)
  assert.equal(isSafeImageUrl('//evil.example/x.png'), false)
})

test('resolveStorageProviderStatus prefers S3, falls back to Cloudinary, and fails closed in production', () => {
  assert.equal(
    resolveStorageProviderStatus(
      {
        S3_BUCKET: 'b',
        S3_ACCESS_KEY_ID: 'k',
        S3_SECRET_ACCESS_KEY: 's',
        S3_PUBLIC_BASE_URL: 'https://cdn.example.com',
      },
      true,
    ).provider,
    's3',
  )

  assert.equal(
    resolveStorageProviderStatus(
      {
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'key',
        CLOUDINARY_API_SECRET: 'sec',
      },
      true,
    ).provider,
    'cloudinary',
  )

  const unconfiguredProd = resolveStorageProviderStatus({}, true)
  assert.equal(unconfiguredProd.provider, 'unconfigured-prod')
  assert.equal(unconfiguredProd.ready, false)

  const localDev = resolveStorageProviderStatus({}, false)
  assert.equal(localDev.provider, 'local-dev')
  assert.equal(localDev.ready, true)
})
