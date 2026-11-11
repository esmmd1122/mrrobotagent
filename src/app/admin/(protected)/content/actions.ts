'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'

export async function saveSiteContent(formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.CONTENT_MANAGE)
  const heroSlogan = String(formData.get('heroSlogan') || '')
  const heroSubtitle = String(formData.get('heroSubtitle') || '')
  const footerTagline = String(formData.get('footerTagline') || '')
  const telegram = String(formData.get('telegram') || '')

  const updates = [
      { key: 'hero.slogan', section: 'hero', value: { text: heroSlogan } },
      { key: 'hero.subtitle', section: 'hero', value: { text: heroSubtitle } },
      { key: 'footer.tagline', section: 'footer', value: { text: footerTagline } },
      { key: 'contact.telegram', section: 'contact', value: { url: telegram } },
    ] as const

  for (const row of updates) {
    await prisma.siteContent.upsert({
      where: { key: row.key },
      update: { valueJson: JSON.stringify(row.value), section: row.section },
      create: {
        key: row.key,
        section: row.section,
        valueJson: JSON.stringify(row.value),
      },
    })
  }

  await logActivity({
    adminId: session.sub,
    action: 'content.update',
    entity: 'SiteContent',
  })

  revalidatePath('/')
  revalidatePath('/admin/content')
}
