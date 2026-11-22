import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession, hasPermission } from '@/lib/auth/session'
import { PERMISSIONS } from '@/lib/auth/constants'
import { normalizeAndValidateProductImageUrl } from '@/lib/storage-validation'
import { updateSectionImageInWebsiteSettings } from '@/lib/site-config/service'

const bodySchema = z.object({
  imageUrl: z.string().max(1500),
  imageAlt: z.string().max(200).optional(),
})

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { error: 'دسترسی غیرمجاز — لطفاً ابتدا وارد پنل مدیریت شوید.' },
      { status: 401 },
    )
  }

  const allowed =
    hasPermission(session, PERMISSIONS.CONTENT_MANAGE) ||
    hasPermission(session, PERMISSIONS.AI_MANAGE)
  if (!allowed) {
    return NextResponse.json(
      { error: 'مجوز ویرایش تصویر بخش MR.ROBOT AI را ندارید.' },
      { status: 403 },
    )
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست نامعتبر است.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'اطلاعات ارسالی معتبر نیست.' }, { status: 400 })
  }

  const trimmedUrl = parsed.data.imageUrl.trim()
  let validatedUrl = ''

  if (trimmedUrl) {
    const check = normalizeAndValidateProductImageUrl(trimmedUrl, {
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    })
    if (!check.ok) {
      return NextResponse.json(
        { error: check.messageFa || 'آدرس تصویر معتبر نیست.' },
        { status: 400 },
      )
    }
    validatedUrl = check.url ?? ''
  }

  const saved = await updateSectionImageInWebsiteSettings({
    sectionId: 'services',
    imageUrl: validatedUrl,
    imageAlt: parsed.data.imageAlt,
    adminId: session.sub,
  })

  revalidatePath('/')
  revalidatePath('/admin/ai')
  revalidatePath('/admin/appearance')

  return NextResponse.json({
    ok: true,
    imageUrl: saved.imageUrl,
    imageAlt: saved.imageAlt,
  })
}
