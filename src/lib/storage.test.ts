import assert from 'node:assert/strict'
import test from 'node:test'
import {
  detectImageMimeFromBytes,
  isSafeImageUrl,
  normalizeAndValidateProductImageUrl,
  resolveStorageProviderStatus,
  sanitizeUploadFolder,
  validateImagePayload,
} from './storage-validation.ts'
import { uploadToCloudinary } from './storage.ts'

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

test('validateImagePayload accepts valid PNG/JPEG/WEBP, image/jpg alias, and empty mobile MIME with valid magic bytes while rejecting spoofed/oversized files', () => {
  const validPng = validateImagePayload({
    declaredMime: 'image/png',
    sizeBytes: PNG_HEADER.length,
    bytes: PNG_HEADER,
  })
  assert.equal(validPng.ok, true)

  const jpgAlias = validateImagePayload({
    declaredMime: 'image/jpg',
    sizeBytes: JPEG_HEADER.length,
    bytes: JPEG_HEADER,
  })
  assert.equal(jpgAlias.ok, true)
  if (jpgAlias.ok) assert.equal(jpgAlias.mime, 'image/jpeg')

  const emptyMimeValidBytes = validateImagePayload({
    declaredMime: '',
    sizeBytes: WEBP_HEADER.length,
    bytes: WEBP_HEADER,
  })
  assert.equal(emptyMimeValidBytes.ok, true)
  if (emptyMimeValidBytes.ok) assert.equal(emptyMimeValidBytes.mime, 'image/webp')

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

test('normalizeAndValidateProductImageUrl validates Cloudinary HTTPS URLs, strips bidi marks, preserves legacy URLs, and blocks unsafe inputs', () => {
  const cloudUrl =
    'https://res.cloudinary.com/mrrobot-prod/image/upload/v1732205717/mr-robot/products/abc-123.webp'
  const validCloud = normalizeAndValidateProductImageUrl(cloudUrl, {
    cloudinaryCloudName: 'mrrobot-prod',
  })
  assert.equal(validCloud.ok, true)
  if (validCloud.ok) {
    assert.equal(validCloud.source, 'cloudinary')
    assert.equal(validCloud.url, cloudUrl)
  }

  // Invisible RTL/LTR bidi mark prepended on copy-paste in Persian UI
  const withBidi = normalizeAndValidateProductImageUrl(`\u200e${cloudUrl}\u200f`, {
    cloudinaryCloudName: 'mrrobot-prod',
  })
  assert.equal(withBidi.ok, true)
  if (withBidi.ok) assert.equal(withBidi.url, cloudUrl)

  // Protocol-relative & http Cloudinary URLs upgrade cleanly to https://
  const protoRelCloud = normalizeAndValidateProductImageUrl(
    '//res-1.cloudinary.com/mrrobot-prod/image/upload/v1/mr-robot/products/x.png',
    { cloudinaryCloudName: 'mrrobot-prod' },
  )
  assert.equal(protoRelCloud.ok, true)
  if (protoRelCloud.ok) {
    assert.equal(
      protoRelCloud.url,
      'https://res-1.cloudinary.com/mrrobot-prod/image/upload/v1/mr-robot/products/x.png',
    )
  }

  // Wrong Cloudinary account rejected for new URLs
  const wrongCloud = normalizeAndValidateProductImageUrl(
    'https://res.cloudinary.com/other-account/image/upload/v1/img.png',
    { cloudinaryCloudName: 'mrrobot-prod' },
  )
  assert.equal(wrongCloud.ok, false)
  if (!wrongCloud.ok) assert.equal(wrongCloud.code, 'INVALID_CLOUDINARY_ACCOUNT')

  // Unchanged legacy URL on older product remains compatible
  const legacyUrl = 'https://res.cloudinary.com/old-account/image/upload/v1/legacy.png'
  const legacyPreserved = normalizeAndValidateProductImageUrl(legacyUrl, {
    cloudinaryCloudName: 'mrrobot-prod',
    legacyExistingUrl: legacyUrl,
  })
  assert.equal(legacyPreserved.ok, true)

  // Legacy relative path without leading slash normalized
  const legacyRel = normalizeAndValidateProductImageUrl('uploads/products/legacy.jpg')
  assert.equal(legacyRel.ok, true)
  if (legacyRel.ok) assert.equal(legacyRel.url, '/uploads/products/legacy.jpg')

  // Unsafe schemes, arbitrary protocol-relative URLs, traversal, and private hosts blocked
  assert.equal(isSafeImageUrl('/uploads/products/test.webp'), true)
  assert.equal(isSafeImageUrl('https://cdn.example.com/img.png'), true)
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false)
  assert.equal(isSafeImageUrl('data:image/svg+xml,<svg/>'), false)
  assert.equal(isSafeImageUrl('blob:https://mrrobot.ir/123'), false)
  assert.equal(isSafeImageUrl('//evil.example/x.png'), false)
  assert.equal(isSafeImageUrl('https://127.0.0.1/internal.png'), false)
  assert.equal(isSafeImageUrl('https://169.254.169.254/latest/meta-data'), false)
  assert.equal(isSafeImageUrl('https://user:pass@res.cloudinary.com/a/image/upload/x.png'), false)
  assert.equal(isSafeImageUrl('/uploads/../etc/passwd'), false)
})

test('resolveStorageProviderStatus prefers S3, falls back to Cloudinary, trims whitespace, and fails closed in production', () => {
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

  // Partial S3 (missing S3_PUBLIC_BASE_URL) falls through cleanly to Cloudinary
  assert.equal(
    resolveStorageProviderStatus(
      {
        S3_BUCKET: 'b',
        S3_ACCESS_KEY_ID: 'k',
        S3_SECRET_ACCESS_KEY: 's',
        CLOUDINARY_CLOUD_NAME: '  demo \n',
        CLOUDINARY_API_KEY: ' key ',
        CLOUDINARY_API_SECRET: ' sec ',
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

test('uploadToCloudinary signs request with trimmed env vars, validates secure_url, and reports distinct provider errors', async () => {
  const originalFetch = globalThis.fetch
  let capturedUrl = ''
  let capturedSignature = ''

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input)
      const body = init?.body as FormData
      capturedSignature = String(body.get('signature') || '')
      assert.equal(body.get('api_key'), 'key-123')
      assert.equal(body.get('folder'), 'mr-robot/products')
      return new Response(
        JSON.stringify({
          secure_url:
            'https://res.cloudinary.com/demo-cloud/image/upload/v1732205717/mr-robot/products/sample.png',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as typeof fetch

    const secureUrl = await uploadToCloudinary(
      Buffer.from(PNG_HEADER),
      'products',
      'image/png',
      'png',
      {
        CLOUDINARY_CLOUD_NAME: ' demo-cloud \n',
        CLOUDINARY_API_KEY: ' key-123 ',
        CLOUDINARY_API_SECRET: ' secret-xyz ',
      },
    )
    assert.equal(
      capturedUrl,
      'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
    )
    assert.match(capturedSignature, /^[0-9a-f]{40}$/)
    assert.equal(
      secureUrl,
      'https://res.cloudinary.com/demo-cloud/image/upload/v1732205717/mr-robot/products/sample.png',
    )

    // 401 auth failure -> distinct CLOUDINARY_AUTH_FAILED
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'Invalid Signature' } }), {
        status: 401,
      })) as typeof fetch
    await assert.rejects(
      () =>
        uploadToCloudinary(Buffer.from(PNG_HEADER), 'products', 'image/png', 'png', {
          CLOUDINARY_CLOUD_NAME: 'demo-cloud',
          CLOUDINARY_API_KEY: 'key-123',
          CLOUDINARY_API_SECRET: 'bad-secret',
        }),
      /CLOUDINARY_AUTH_FAILED/,
    )

    // Mismatched secure_url cloud -> CLOUDINARY_INVALID_URL
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          secure_url: 'https://res.cloudinary.com/wrong-cloud/image/upload/v1/x.png',
        }),
        { status: 200 },
      )) as typeof fetch
    await assert.rejects(
      () =>
        uploadToCloudinary(Buffer.from(PNG_HEADER), 'products', 'image/png', 'png', {
          CLOUDINARY_CLOUD_NAME: 'demo-cloud',
          CLOUDINARY_API_KEY: 'key-123',
          CLOUDINARY_API_SECRET: 'secret-xyz',
        }),
      /CLOUDINARY_INVALID_URL/,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
