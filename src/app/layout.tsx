import type { Metadata } from 'next'
import { Vazirmatn } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'MR.ROBOT | خدمات دیجیتال پریمیوم',
    template: '%s | MR.ROBOT',
  },
  description:
    'با مستر ربات فکرتو نذار — اشتراک‌های دیجیتال و راهکارهای هوش مصنوعی برای زندگی و کسب‌وکار.',
  openGraph: {
    title: 'MR.ROBOT',
    description: 'دنیای دیجیتال، یک قدم جلوتر',
    locale: 'fa_IR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
