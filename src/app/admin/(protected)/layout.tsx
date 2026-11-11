import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { requireAdmin } from '@/lib/auth/require-admin'
import Link from 'next/link'

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAdmin()

  return (
    <div className="admin-shell min-h-screen" dir="rtl">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(225,6,0,0.08),transparent_55%)]"
        aria-hidden
      />
      <div className="sticky top-0 z-40 border-b border-[#2a2b35] bg-[#050506]/95 p-3 backdrop-blur lg:hidden">
        <MobileHeader />
      </div>
      <div className="mx-auto flex max-w-[1600px] gap-4 p-4 lg:gap-6 lg:p-6">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <AdminHeader name={session.name} email={session.email} />
          {children}
        </main>
      </div>
    </div>
  )
}

function MobileHeader() {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" dir="ltr">
          MR.ROBOT Admin
        </p>
        <Link href="/" className="text-xs text-white/60">
          سایت
        </Link>
      </div>
      <MobileLinks />
    </div>
  )
}

function MobileLinks() {
  const items = [
    ['خانه', '/admin'],
    ['محصولات', '/admin/products'],
    ['سفارش‌ها', '/admin/orders'],
    ['پشتیبانی', '/admin/support'],
  ] as const
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1 text-xs">
      {items.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="shrink-0 rounded-md border border-[#2a2b35] px-2 py-1 text-white/75"
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
