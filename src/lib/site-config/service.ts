import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { DEFAULT_WEBSITE_CONFIG } from './defaults'
import { normalizeWebsiteConfig } from './cms-helpers'
import { websiteConfigSchema, type WebsiteConfig } from './types'

const SETTINGS_ID = 'default'
export const PREVIEW_COOKIE = 'mr_robot_site_preview'

function parseConfig(json: string): WebsiteConfig {
  try {
    const raw = JSON.parse(json)
    const parsed = websiteConfigSchema.safeParse(raw)
    if (!parsed.success) return DEFAULT_WEBSITE_CONFIG
    return normalizeWebsiteConfig(parsed.data)
  } catch {
    return DEFAULT_WEBSITE_CONFIG
  }
}

export async function ensureWebsiteSettings() {
  const existing = await prisma.websiteSettings.findUnique({
    where: { id: SETTINGS_ID },
  })
  if (existing) return existing

  let config = { ...DEFAULT_WEBSITE_CONFIG }

  const legacy = await prisma.siteContent.findMany()
  for (const row of legacy) {
    try {
      const v = JSON.parse(row.valueJson) as Record<string, string>
      if (row.key === 'hero.slogan' && v.text) config.hero.slogan = v.text
      if (row.key === 'hero.subtitle' && v.text) config.hero.subtitle = v.text
      if (row.key === 'footer.tagline' && v.text) config.footer.tagline = v.text
      if (row.key === 'contact.telegram' && v.url)
        config.footer.social.telegram = v.url
    } catch {
      /* ignore */
    }
  }

  const json = JSON.stringify(config)
  return prisma.websiteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: {
      id: SETTINGS_ID,
      draftConfig: json,
      publishedConfig: json,
      publishedAt: new Date(),
    },
  })
}

export async function getPublishedWebsiteConfig(): Promise<WebsiteConfig> {
  await ensureWebsiteSettings()
  const row = await prisma.websiteSettings.findUniqueOrThrow({
    where: { id: SETTINGS_ID },
  })
  return parseConfig(row.publishedConfig)
}

export async function getDraftWebsiteConfig(): Promise<WebsiteConfig> {
  await ensureWebsiteSettings()
  const row = await prisma.websiteSettings.findUniqueOrThrow({
    where: { id: SETTINGS_ID },
  })
  return parseConfig(row.draftConfig)
}

/** Published config unless admin preview cookie is set. */
export async function getActiveWebsiteConfig(): Promise<WebsiteConfig> {
  const cookieStore = await cookies()
  const preview = cookieStore.get(PREVIEW_COOKIE)?.value === 'draft'
  if (preview) {
    return getDraftWebsiteConfig()
  }
  return getPublishedWebsiteConfig()
}

export function validateWebsiteConfig(input: unknown): WebsiteConfig {
  const parsed = websiteConfigSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error('پیکربندی نامعتبر است')
  }
  return normalizeWebsiteConfig(parsed.data)
}

export async function saveDraftWebsiteConfig(
  config: WebsiteConfig,
  adminId?: string,
) {
  validateWebsiteConfig(config)
  const json = JSON.stringify(config)
  await prisma.websiteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { draftConfig: json },
    create: {
      id: SETTINGS_ID,
      draftConfig: json,
      publishedConfig: json,
    },
  })
  if (adminId) {
    await prisma.activityLog.create({
      data: {
        adminId,
        action: 'website.draft_save',
        entity: 'WebsiteSettings',
        entityId: SETTINGS_ID,
      },
    })
  }
}

export async function publishWebsiteConfig(adminId: string, label?: string) {
  const row = await prisma.websiteSettings.findUniqueOrThrow({
    where: { id: SETTINGS_ID },
  })
  const config = parseConfig(row.draftConfig)
  validateWebsiteConfig(config)
  const json = row.draftConfig

  await prisma.$transaction([
    prisma.websiteSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        publishedConfig: json,
        publishedAt: new Date(),
      },
    }),
    prisma.websiteSettingsRevision.create({
      data: {
        configJson: json,
        label: label || 'انتشار دستی',
        adminId,
      },
    }),
    prisma.activityLog.create({
      data: {
        adminId,
        action: 'website.publish',
        entity: 'WebsiteSettings',
        entityId: SETTINGS_ID,
      },
    }),
  ])
}

export async function restoreWebsiteRevision(revisionId: string, adminId: string) {
  const rev = await prisma.websiteSettingsRevision.findUniqueOrThrow({
    where: { id: revisionId },
  })
  parseConfig(rev.configJson)
  await prisma.websiteSettings.update({
    where: { id: SETTINGS_ID },
    data: { draftConfig: rev.configJson },
  })
  await prisma.activityLog.create({
    data: {
      adminId,
      action: 'website.revision_restore',
      entity: 'WebsiteSettingsRevision',
      entityId: revisionId,
    },
  })
}

/**
 * Updates a specific homepage section's imageUrl and optional imageAlt across both
 * draftConfig and publishedConfig in the existing WebsiteSettings record, so changes
 * appear immediately on the public site and stay synchronized with WebsiteEditor.
 */
export async function updateSectionImageInWebsiteSettings(params: {
  sectionId: WebsiteConfig['sections'][number]['id']
  imageUrl: string
  imageAlt?: string
  adminId: string
}): Promise<{ imageUrl: string; imageAlt: string }> {
  await ensureWebsiteSettings()
  const row = await prisma.websiteSettings.findUniqueOrThrow({
    where: { id: SETTINGS_ID },
  })

  const cleanUrl = params.imageUrl.trim()
  const cleanAlt = (params.imageAlt ?? '').trim().slice(0, 200)

  const patchSectionList = (cfg: WebsiteConfig): WebsiteConfig => ({
    ...cfg,
    sections: cfg.sections.map((sec) =>
      sec.id === params.sectionId
        ? {
            ...sec,
            imageUrl: cleanUrl,
            imageAlt: params.imageAlt !== undefined ? cleanAlt : sec.imageAlt || '',
          }
        : sec,
    ),
  })

  const nextDraft = validateWebsiteConfig(patchSectionList(parseConfig(row.draftConfig)))
  const nextPublished = validateWebsiteConfig(patchSectionList(parseConfig(row.publishedConfig)))

  await prisma.$transaction([
    prisma.websiteSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        draftConfig: JSON.stringify(nextDraft),
        publishedConfig: JSON.stringify(nextPublished),
        publishedAt: new Date(),
      },
    }),
    prisma.activityLog.create({
      data: {
        adminId: params.adminId,
        action: cleanUrl ? 'website.section_image_save' : 'website.section_image_remove',
        entity: 'WebsiteSettings',
        entityId: `${SETTINGS_ID}:${params.sectionId}`,
        metadata: JSON.stringify({
          sectionId: params.sectionId,
          hasImage: Boolean(cleanUrl),
        }),
      },
    }),
  ])

  return { imageUrl: cleanUrl, imageAlt: cleanAlt }
}

export function themeToCssVars(
  theme: WebsiteConfig['theme'],
): Record<string, string> {
  return {
    '--site-primary': theme.primaryColor,
    '--site-secondary': theme.secondaryColor,
    '--site-bg': theme.backgroundColor,
    '--site-font-scale': String(theme.fontScale),
    '--site-btn-radius': `${theme.buttonRadius}px`,
    '--site-btn-border': `${theme.buttonBorderWidth}px`,
  }
}
