import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/require-admin'
import { storeImage } from '@/lib/storage'
import { PERMISSIONS } from '@/lib/auth/constants'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: Request) {
  const auth = await requireAdminApi(PERMISSIONS.CONTENT_MANAGE)
  if (auth.error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 400 })
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'فرمت مجاز: JPG, PNG, WebP, GIF' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'حداکثر حجم ۵ مگابایت' }, { status: 400 })
  }

  let url = ''
  try {
    url = await storeImage(file, 'media', MAX_BYTES)
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'INVALID_IMAGE' || code === 'IMAGE_TOO_LARGE') {
      return NextResponse.json({ error: 'فایل تصویر مجاز نیست' }, { status: 400 })
    }
    return NextResponse.json({ error: 'ذخیره فایل ممکن نیست' }, { status: 503 })
  }
  const asset = await prisma.mediaAsset.create({
    data: {
      filename: file.name,
      url,
      mimeType: file.type,
      sizeBytes: file.size,
      altText: String(form.get('altText') || ''),
    },
  })

  await logActivity({
    adminId: auth.session!.sub,
    action: 'media.upload',
    entity: 'MediaAsset',
    entityId: asset.id,
  })

  return NextResponse.json({ ok: true, asset })
}
