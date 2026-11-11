'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import {
  publishWebsiteConfig,
  restoreWebsiteRevision,
  saveDraftWebsiteConfig,
  validateWebsiteConfig,
} from '@/lib/site-config/service'
import type { WebsiteConfig } from '@/lib/site-config/types'
import { prisma } from '@/lib/db'

export async function saveWebsiteDraftAction(configJson: string) {
  const session = await requireAdmin(PERMISSIONS.CONTENT_MANAGE)
  const config = validateWebsiteConfig(JSON.parse(configJson))
  await saveDraftWebsiteConfig(config, session.sub)
  revalidatePath('/admin/appearance')
}

export async function publishWebsiteAction(confirm: string, label?: string) {
  const session = await requireAdmin(PERMISSIONS.CONTENT_MANAGE)
  if (confirm !== 'PUBLISH') {
    throw new Error('تأیید انتشار لازم است (PUBLISH).')
  }
  await publishWebsiteConfig(session.sub, label)
  revalidatePath('/')
  revalidatePath('/admin/appearance')
}

export async function restoreRevisionAction(revisionId: string) {
  const session = await requireAdmin(PERMISSIONS.CONTENT_MANAGE)
  await restoreWebsiteRevision(revisionId, session.sub)
  revalidatePath('/admin/appearance')
}

export async function upsertSitePageAction(formData: FormData) {
  await requireAdmin(PERMISSIONS.CONTENT_MANAGE)
  const id = String(formData.get('id') || '')
  const slug = String(formData.get('slug') || '').trim()
  const title = String(formData.get('title') || '').trim()
  const metaTitle = String(formData.get('metaTitle') || '')
  const metaDescription = String(formData.get('metaDescription') || '')
  const heroImageUrl = String(formData.get('heroImageUrl') || '')
  const bodyHtml = String(formData.get('bodyHtml') || '')
  const status = String(formData.get('status') || 'DRAFT')

  if (!slug || !title) throw new Error('slug و عنوان الزامی است')

  if (id) {
    await prisma.sitePage.update({
      where: { id },
      data: {
        slug,
        title,
        metaTitle,
        metaDescription,
        heroImageUrl,
        bodyHtml,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
    })
  } else {
    await prisma.sitePage.create({
      data: {
        slug,
        title,
        metaTitle,
        metaDescription,
        heroImageUrl,
        bodyHtml,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
    })
  }
  revalidatePath('/admin/appearance')
  revalidatePath(`/p/${slug}`)
}

export type WebsiteEditorPayload = {
  draft: WebsiteConfig
  publishedAt: string | null
}
