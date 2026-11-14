'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { hashPassword } from '@/lib/auth/password'
import { logActivity } from '@/lib/activity'

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(128),
  roleId: z.string().uuid(),
})

export async function createAdminUser(formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.ADMINS_MANAGE)
  const parsed = createSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('ورودی نامعتبر')

  const role = await prisma.adminRole.findUnique({ where: { id: parsed.data.roleId } })
  if (!role) throw new Error('نقش نامعتبر')

  if (role.slug === 'super-admin' && session.roleSlug !== 'super-admin') {
    throw new Error('فقط مدیر ارشد می‌تواند نقش super-admin بدهد.')
  }

  const email = parsed.data.email.toLowerCase()
  const passwordHash = await hashPassword(parsed.data.password)

  const admin = await prisma.adminUser.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
      roleId: role.id,
      isActive: true,
    },
  })

  await logActivity({
    adminId: session.sub,
    action: 'admin.create',
    entity: 'AdminUser',
    entityId: admin.id,
  })
  revalidatePath('/admin/admins')
}

export async function setAdminActive(adminId: string, isActive: boolean) {
  const session = await requireAdmin(PERMISSIONS.ADMINS_MANAGE)
  if (session.sub === adminId && !isActive) {
    throw new Error('نمی‌توانید خودتان را غیرفعال کنید.')
  }

  const target = await prisma.adminUser.findUnique({ where: { id: adminId }, include: { role: true } })
  if (!target) throw new Error('کاربر یافت نشد')
  if (target.role.slug === 'super-admin' && session.roleSlug !== 'super-admin') {
    throw new Error('تغییر مدیر ارشد مجاز نیست.')
  }

  await prisma.adminUser.update({ where: { id: adminId }, data: { isActive } })
  await logActivity({
    adminId: session.sub,
    action: isActive ? 'admin.enable' : 'admin.disable',
    entity: 'AdminUser',
    entityId: adminId,
  })
  revalidatePath('/admin/admins')
}

export async function toggleAdminActive(adminId: string, _formData: FormData) {
  const target = await prisma.adminUser.findUnique({ where: { id: adminId } })
  if (!target) throw new Error('کاربر یافت نشد')
  await setAdminActive(adminId, !target.isActive)
}

const roleSchema = z.object({
  roleId: z.string().uuid(),
})

export async function updateAdminRole(adminId: string, formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.ADMINS_MANAGE)
  const parsed = roleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('نقش نامعتبر')

  const [target, role] = await Promise.all([
    prisma.adminUser.findUnique({ where: { id: adminId }, include: { role: true } }),
    prisma.adminRole.findUnique({ where: { id: parsed.data.roleId } }),
  ])
  if (!target || !role) throw new Error('رکورد یافت نشد')

  if (target.role.slug === 'super-admin' && session.roleSlug !== 'super-admin') {
    throw new Error('تغییر مدیر ارشد مجاز نیست.')
  }
  if (role.slug === 'super-admin' && session.roleSlug !== 'super-admin') {
    throw new Error('فقط مدیر ارشد می‌تواند نقش super-admin بدهد.')
  }

  await prisma.adminUser.update({ where: { id: adminId }, data: { roleId: role.id } })
  await logActivity({
    adminId: session.sub,
    action: 'admin.role_update',
    entity: 'AdminUser',
    entityId: adminId,
    metadata: { roleSlug: role.slug },
  })
  revalidatePath('/admin/admins')
}

export async function ensureDefaultRoles() {
  const session = await requireAdmin(PERMISSIONS.ADMINS_MANAGE)
  void session
  await prisma.adminRole.upsert({
    where: { slug: 'support-operator' },
    update: {},
    create: {
      slug: 'support-operator',
      name: 'اپراتور پشتیبانی',
      permissions: JSON.stringify([
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.ORDERS_MANAGE,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.SUPPORT_MANAGE,
        PERMISSIONS.ACTIVITY_VIEW,
      ]),
    },
  })
}