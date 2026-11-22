import { DEFAULT_WEBSITE_CONFIG } from './defaults'
import { CMS_SECTION_IDS, type CmsSectionId, type SectionConfig, type WebsiteConfig } from './types'

export const CMS_SECTION_LABELS: Record<CmsSectionId, string> = {
  intro: 'معرفی و هویت برند',
  services: 'بخش MR.ROBOT AI — سازنده پروژه هوش مصنوعی',
  subscriptions: 'فروشگاه تعاملی و محصولات',
  ai: 'فناوری هوش مصنوعی (تجربه و سرویس‌ها)',
  other: 'خدمات اپل و موبایل',
  trust: 'اعتماد، فرآیند خرید و پشتیبانی',
  finale: 'بخش پایانی و دعوت به اقدام',
}

/**
 * Blocks dangerous URL schemes (javascript:, data:, vbscript:) in CMS-managed links & images.
 */
export function safeCmsHref(raw: string | null | undefined, fallback = '/'): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) return fallback
  if (trimmed.startsWith('#') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
    return trimmed
  }
  try {
    const u = new URL(trimmed)
    if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:' || u.protocol === 'tel:') {
      return trimmed
    }
  } catch {
    return fallback
  }
  return fallback
}

/**
 * Ensures any legacy WebsiteConfig (e.g. with only 3 sections) is upgraded seamlessly
 * to include all 7 section entries while preserving the admin's saved overrides.
 */
export function normalizeSections(sections: SectionConfig[] | undefined): SectionConfig[] {
  const byId = new Map<CmsSectionId, SectionConfig>()
  for (const s of sections ?? []) {
    if (CMS_SECTION_IDS.includes(s.id)) {
      byId.set(s.id, s)
    }
  }

  return DEFAULT_WEBSITE_CONFIG.sections
    .map((def) => {
      const saved = byId.get(def.id)
      if (!saved) return { ...def }
      return {
        ...def,
        ...saved,
        title: saved.title ?? def.title,
        description: saved.description ?? def.description,
      }
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function normalizeWebsiteConfig(config: WebsiteConfig): WebsiteConfig {
  return {
    ...DEFAULT_WEBSITE_CONFIG,
    ...config,
    theme: {
      ...DEFAULT_WEBSITE_CONFIG.theme,
      ...config.theme,
    },
    hero: {
      ...DEFAULT_WEBSITE_CONFIG.hero,
      ...config.hero,
      ctaPrimary: {
        label: config.hero?.ctaPrimary?.label || DEFAULT_WEBSITE_CONFIG.hero.ctaPrimary.label,
        href: safeCmsHref(config.hero?.ctaPrimary?.href, '#marketplace'),
      },
      ctaSecondary: {
        label: config.hero?.ctaSecondary?.label || DEFAULT_WEBSITE_CONFIG.hero.ctaSecondary.label,
        href: safeCmsHref(config.hero?.ctaSecondary?.href, '#services'),
      },
      featuredProductSlugs: Array.isArray(config.hero?.featuredProductSlugs)
        ? config.hero.featuredProductSlugs
        : [],
    },
    sections: normalizeSections(config.sections),
    navigation: {
      header: (config.navigation?.header ?? DEFAULT_WEBSITE_CONFIG.navigation.header).map((link) => ({
        ...link,
        href: safeCmsHref(link.href, '/'),
      })),
      footerQuickLinks: (
        config.navigation?.footerQuickLinks ?? DEFAULT_WEBSITE_CONFIG.navigation.footerQuickLinks
      ).map((link) => ({
        ...link,
        href: safeCmsHref(link.href, '/'),
      })),
      purchaseCta: {
        label: config.navigation?.purchaseCta?.label || DEFAULT_WEBSITE_CONFIG.navigation.purchaseCta.label,
        href: safeCmsHref(config.navigation?.purchaseCta?.href, '/shop'),
      },
    },
    footer: {
      ...DEFAULT_WEBSITE_CONFIG.footer,
      ...config.footer,
      social: {
        ...DEFAULT_WEBSITE_CONFIG.footer.social,
        ...config.footer?.social,
      },
    },
    seo: {
      ...DEFAULT_WEBSITE_CONFIG.seo,
      ...config.seo,
    },
  }
}

export function getSectionConfig(config: WebsiteConfig, id: CmsSectionId): SectionConfig {
  const normalized = normalizeSections(config.sections)
  return (
    normalized.find((s) => s.id === id) ??
    DEFAULT_WEBSITE_CONFIG.sections.find((s) => s.id === id)!
  )
}

export function calculateDiscountPercent(
  listPrice: number | null | undefined,
  unitPrice: number | null | undefined,
): number | null {
  if (listPrice == null || unitPrice == null) return null
  if (listPrice <= 0 || unitPrice >= listPrice) return null
  const pct = Math.round(((listPrice - unitPrice) / listPrice) * 100)
  return pct > 0 && pct < 100 ? pct : null
}
