import { z } from 'zod'

export const navLinkSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  href: z.string().min(1),
  enabled: z.boolean().default(true),
  children: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        href: z.string(),
        enabled: z.boolean().default(true),
      }),
    )
    .optional(),
})

export const sectionSchema = z.object({
  id: z.enum(['subscriptions', 'ai', 'other']),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
  title: z.string().optional(),
  description: z.string().optional(),
})

export const websiteConfigSchema = z.object({
  theme: z.object({
    mode: z.enum(['dark', 'light']).default('dark'),
    primaryColor: z.string().default('#e10600'),
    secondaryColor: z.string().default('#121318'),
    backgroundColor: z.string().default('#050506'),
    gradientEnabled: z.boolean().default(true),
    fontScale: z.number().min(0.85).max(1.25).default(1),
    buttonRadius: z.number().min(4).max(24).default(12),
    buttonBorderWidth: z.number().min(0).max(4).default(1),
  }),
  hero: z.object({
    enabled: z.boolean().default(true),
    brandLabel: z.string().default('PREMIUM DIGITAL'),
    slogan: z.string(),
    subtitle: z.string(),
    description: z.string().optional(),
    ctaPrimary: z.object({ label: z.string(), href: z.string() }),
    ctaSecondary: z.object({ label: z.string(), href: z.string() }),
    characterImageUrl: z.string(),
    cinematicBgUrl: z.string(),
    showSectionPreviews: z.boolean().default(true),
  }),
  sections: z.array(sectionSchema),
  navigation: z.object({
    header: z.array(navLinkSchema),
    footerQuickLinks: z.array(navLinkSchema),
    purchaseCta: z.object({ label: z.string(), href: z.string() }),
  }),
  footer: z.object({
    tagline: z.string(),
    columnTitleLinks: z.string().default('مسیرهای سریع'),
    columnTitleFuture: z.string().default('آینده پلتفرم'),
    futureText: z.string(),
    social: z.object({
      telegram: z.string().optional(),
      instagram: z.string().optional(),
      twitter: z.string().optional(),
    }),
  }),
  seo: z.object({
    homeTitle: z.string().optional(),
    homeDescription: z.string().optional(),
  }),
})

export type WebsiteConfig = z.infer<typeof websiteConfigSchema>
export type NavLinkConfig = z.infer<typeof navLinkSchema>
