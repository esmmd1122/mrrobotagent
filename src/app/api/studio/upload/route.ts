import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getStudioSession, canManage } from '@/modules/salon/auth'
import { storeImage } from '@/lib/storage'

export async function POST(req: Request) {
  const session = await getStudioSession()
  if (!session || !canManage(session.role)) {
    return NextResponse.redirect(new URL('/studio/login', req.url), 303)
  }
  const form = await req.formData()
  const field = String(form.get('field') || '')
  const file = form.get('file')
  if (!['logoUrl', 'coverUrl'].includes(field) || !(file instanceof File)) {
    return NextResponse.redirect(new URL('/studio/settings?upload=invalid', req.url), 303)
  }
  try {
    const url = await storeImage(file, `salon/${session.businessId}`)
    await prisma.salonBusiness.update({
      where: { id: session.businessId },
      data: { [field]: url },
    })
    return NextResponse.redirect(new URL('/studio/settings?upload=ok', req.url), 303)
  } catch {
    return NextResponse.redirect(new URL('/studio/settings?upload=failed', req.url), 303)
  }
}
