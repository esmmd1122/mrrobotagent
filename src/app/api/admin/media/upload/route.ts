import { NextResponse } from 'next/server'
import { getSession, hasPermission } from '@/lib/auth/session'
import { PERMISSIONS } from '@/lib/auth/constants'
import {
  DEFAULT_MAX_IMAGE_BYTES,
  getStorageProviderStatus,
  sanitizeUploadFolder,
  storeImage,
} from '@/lib/storage'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'

async function authorizeMediaAdmin() {
  const session = await getSession()
  if (!session) return { session: null, status: 401 as const }
  const allowed =
    hasPermission(session, PERMISSIONS.PRODUCTS_MANAGE) ||
    hasPermission(session, PERMISSIONS.CONTENT_MANAGE)
  if (!allowed) return { session: null, status: 403 as const }
  return { session, status: 200 as const }
}

export async function GET() {
  const auth = await authorizeMediaAdmin()
  if (!auth.session) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'دسترسی غیرمجاز — لطفاً وارد پنل مدیریت شوید.' : 'مجوز آپلود رسانه ندارید.' },
      { status: auth.status },
    )
  }

  return NextResponse.json(
    {
      ok: true,
      storage: getStorageProviderStatus(),
      maxBytes: DEFAULT_MAX_IMAGE_BYTES,
      allowedFormats: ['JPG', 'JPEG', 'PNG', 'WEBP'],
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(req: Request) {
  const auth = await authorizeMediaAdmin()
  if (!auth.session) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'دسترسی غیرمجاز — لطفاً ابتدا وارد پنل مدیریت شوید.' : 'مجوز آپلود تصویر ندارید.' },
      { status: auth.status },
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'درخواست آپلود نامعتبر است.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'فایل تصویر ارسال نشده است.' }, { status: 400 })
  }

  const folder = sanitizeUploadFolder(String(form.get('folder') || 'media'))
  const altText = String(form.get('altText') || '').trim().slice(0, 200)

  let url = ''
  try {
    url = await storeImage(file, folder, DEFAULT_MAX_IMAGE_BYTES)
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'EMPTY_IMAGE') {
      return NextResponse.json({ error: 'فایل انتخاب‌شده خالی است.' }, { status: 400 })
    }
    if (code === 'INVALID_IMAGE') {
      return NextResponse.json(
        { error: 'فرمت تصویر نامعتبر است. فقط JPG، JPEG، PNG و WEBP مجاز هستند.' },
        { status: 400 },
      )
    }
    if (code === 'IMAGE_TOO_LARGE') {
      return NextResponse.json(
        { error: 'حجم تصویر بیشتر از حد مجاز ۵ مگابایت است.' },
        { status: 400 },
      )
    }
    if (code === 'PERSISTENT_STORAGE_REQUIRED' || code === 'S3_PUBLIC_BASE_URL') {
      return NextResponse.json(
        {
          error:
            'فضای ذخیره‌سازی ماندگار (S3/R2 یا Cloudinary) روی سرور تولیدی تنظیم نشده است. متغیرهای ذخیره‌سازی ابری را در سرور پیکربندی کنید.',
          code: 'PERSISTENT_STORAGE_REQUIRED',
        },
        { status: 503 },
      )
    }
    return NextResponse.json(
      { error: 'خطا در ذخیره فایل تصویر. لطفاً تنظیمات فضای ذخیره‌سازی را بررسی کنید.' },
      { status: 503 },
    )
  }

  const safeFilename = (file.name || 'image').replace(/[^\w.\-\u0600-\u06FF ]+/g, '_').slice(0, 120)

  const asset = await prisma.mediaAsset.create({
    data: {
      filename: safeFilename,
      url,
      mimeType: file.type,
      sizeBytes: file.size,
      altText,
    },
  })

  await logActivity({
    adminId: auth.session.sub,
    action: 'media.upload',
    entity: 'MediaAsset',
    entityId: asset.id,
    metadata: { folder, mimeType: file.type, sizeBytes: file.size },
  })

  return NextResponse.json({
    ok: true,
    url,
    asset,
    storage: getStorageProviderStatus(),
  })
}
