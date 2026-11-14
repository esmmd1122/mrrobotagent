import { NextResponse } from 'next/server'
import { setStudioCookie, signStudio } from '@/modules/salon/auth'
import { registerSalon } from '@/modules/salon/register'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const body = (await req.json()) as {
    salonName?: string
    slug?: string
    category?: string
    ownerName?: string
    email?: string
    password?: string
  }
  try {
    const created = await registerSalon({
      salonName: body.salonName || '',
      slug: body.slug || '',
      category: body.category || 'HAIR_SALON',
      ownerName: body.ownerName || '',
      email: body.email || '',
      password: body.password || '',
    })
    const member = await prisma.salonMembership.findFirstOrThrow({
      where: { businessId: created.business.id, role: 'OWNER' },
    })
    const token = await signStudio({
      sub: member.id,
      businessId: member.businessId,
      role: member.role,
      name: member.name,
      email: member.email,
    })
    await setStudioCookie(token)
    return NextResponse.json({ ok: true, slug: created.business.slug })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ثبت ناموفق بود'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
