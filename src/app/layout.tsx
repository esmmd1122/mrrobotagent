import type { Metadata } from 'next'
import { Vazirmatn } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SiteThemeStyles } from '@/components/site/SiteThemeStyles'
import {
  getActiveWebsiteConfig,
  themeToCssVars,
} from '@/lib/site-config/service'

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const config = await getActiveWebsiteConfig()
  return {
    title: {
      default: config.seo.homeTitle || 'MR.ROBOT | خدمات دیجیتال پریمیوم',
      template: '%s | MR.ROBOT',
    },
    description:
      config.seo.homeDescription ||
      'با مستر ربات فکرتو نذار — اشتراک‌های دیجیتال و راهکارهای هوش مصنوعی.',
    openGraph: {
      title: 'MR.ROBOT',
      description: config.hero.subtitle,
      locale: 'fa_IR',
      type: 'website',
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const site = await getActiveWebsiteConfig()

  return (
    <html
      lang="fa"
      dir="rtl"
      className={vazirmatn.variable}
      data-site-theme={site.theme.mode}
      style={themeToCssVars(site.theme)}
    >
      <body className="min-h-screen flex flex-col">
        <SiteThemeStyles theme={site.theme} />
        <Navbar
          links={site.navigation.header}
          purchaseCta={site.navigation.purchaseCta}
        />
        <main className="flex-1">{children}</main>
        <Footer config={site.footer} quickLinks={site.navigation.footerQuickLinks} />
      </body>
    </html>
  )
}
