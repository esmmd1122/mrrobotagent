import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { JetBrains_Mono, Space_Grotesk, Vazirmatn } from 'next/font/google'
import './globals.css'
import '@/styles/cinema.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CartProvider } from '@/components/cart/CartProvider'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { SiteThemeStyles } from '@/components/site/SiteThemeStyles'
import {
  getActiveWebsiteConfig,
  themeToCssVars,
} from '@/lib/site-config/service'
import { readCart } from '@/modules/commerce/cart-cookie'
import { calculateCartPricing } from '@/modules/commerce/pricing'
import { STORE_CURRENCY_CODE } from '@/modules/commerce/money'
import type { CartPricing } from '@/modules/commerce/types'

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const config = await getActiveWebsiteConfig()
  return {
    title: {
      default: config.seo.homeTitle || 'MR.ROBOT | فناوری دیجیتال، هوش مصنوعی و خدمات تخصصی',
      template: '%s | MR.ROBOT',
    },
    description:
      config.seo.homeDescription ||
      'مرجع تخصصی اشتراک‌های هوش مصنوعی، سرویس‌های امن VPN و V2Ray، خدمات اپل و تعمیرات موبایل و محصولات دیجیتال MR.ROBOT.',
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
  const bare = (await headers()).get('x-mr-chrome') === 'bare'

  let initialPricing: CartPricing = {
    lines: [],
    subtotal: 0,
    discountAmount: 0,
    total: 0,
    discountCode: null,
    currency: STORE_CURRENCY_CODE,
  }
  let cartCount = 0
  let staleCount = 0

  if (!bare) {
    try {
      const lines = await readCart()
      if (lines.length > 0) {
        initialPricing = await calculateCartPricing(lines)
        cartCount = initialPricing.lines.reduce((sum, item) => sum + item.quantity, 0)
        staleCount = Math.max(0, lines.length - initialPricing.lines.length)
      }
    } catch {
      cartCount = 0
      staleCount = 0
    }
  }

  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      data-site-theme={site.theme.mode}
      style={themeToCssVars(site.theme)}
    >
      <body className="min-h-screen flex flex-col">
        <SiteThemeStyles theme={site.theme} />
        <CartProvider
          initialPricing={initialPricing}
          initialCount={cartCount}
          initialStaleCount={staleCount}
        >
          {!bare && (
            <>
              <Navbar
                links={site.navigation.header}
                purchaseCta={site.navigation.purchaseCta}
                cartCount={cartCount}
              />
              <CartDrawer />
            </>
          )}
          <main className="flex-1">{children}</main>
          {!bare && (
            <Footer
              config={site.footer}
              quickLinks={site.navigation.footerQuickLinks}
            />
          )}
        </CartProvider>
      </body>
    </html>
  )
}
