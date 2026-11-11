import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { WebsiteEditor } from '@/components/admin/WebsiteEditor'
import { ensureWebsiteSettings, getDraftWebsiteConfig } from '@/lib/site-config/service'
import { prisma } from '@/lib/db'

export default async function AppearancePage() {
  await requireAdmin(PERMISSIONS.CONTENT_MANAGE)
  await ensureWebsiteSettings()
  const row = await prisma.websiteSettings.findUniqueOrThrow({
    where: { id: 'default' },
  })
  const draft = await getDraftWebsiteConfig()

  const [media, pages, revisions] = await Promise.all([
    prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.sitePage.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.websiteSettingsRevision.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  return (
    <WebsiteEditor
      initialDraft={draft}
      publishedAt={row.publishedAt?.toISOString() || null}
      media={media.map((m) => ({
        id: m.id,
        url: m.url,
        filename: m.filename,
        sizeBytes: m.sizeBytes,
      }))}
      pages={pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        status: p.status,
        metaTitle: p.metaTitle,
      }))}
      revisions={revisions.map((r) => ({
        id: r.id,
        label: r.label,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  )
}
