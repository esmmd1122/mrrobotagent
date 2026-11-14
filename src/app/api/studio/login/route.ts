import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { setStudioCookie, signStudio, verifyPassword } from '@/modules/salon/auth'

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string; slug?: string }
  const email = (body.email || '').trim().toLowerCase()
  const members = await prisma.salonMembership.findMany({
    where: {
      email,
      isActive: true,
      ...(body.slug ? { business: { slug: body.slug } } : {}),
    },
    include: { business: true },
  })
  for (const member of members) {
    if (member.business.status === 'SUSPENDED') continue
    const ok = await verifyPassword(body.password || '', member.passwordHash)
    if (!ok) continue
    const token = await signStudio({
      sub: member.id,
      businessId: member.businessId,
      role: member.role,
      name: member.name,
      email: member.email,
    })
    await setStudioCookie(token)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'ایمیل یا رمز نادرست است' }, { status: 401 })
}
