import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { createSessionToken, setSessionCookie } from '@/lib/auth/session'
import { logActivity } from '@/lib/activity'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'ورودی نامعتبر است.' }, { status: 400 })
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      include: { role: true },
    })

    if (!admin || !admin.isActive) {
      return NextResponse.json({ error: 'ایمیل یا رمز عبور نادرست است.' }, { status: 401 })
    }

    const valid = await verifyPassword(parsed.data.password, admin.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'ایمیل یا رمز عبور نادرست است.' }, { status: 401 })
    }

    const permissions = JSON.parse(admin.role.permissions || '[]') as string[]

    const token = await createSessionToken({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      roleSlug: admin.role.slug,
      permissions,
    })

    await setSessionCookie(token)
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined

    await logActivity({
      adminId: admin.id,
      action: 'admin.login',
      entity: 'AdminUser',
      entityId: admin.id,
      ipAddress: ip,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'خطای سرور. AUTH_SECRET را بررسی کنید.' },
      { status: 500 },
    )
  }
}
