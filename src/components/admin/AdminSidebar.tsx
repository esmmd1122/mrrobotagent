'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'نمای کلی' },
  { href: '/admin/products', label: 'محصولات' },
  { href: '/admin/orders', label: 'سفارش‌ها' },
  { href: '/admin/customers', label: 'مشتریان' },
  { href: '/admin/payments', label: 'پرداخت‌ها' },
  { href: '/admin/ai', label: 'MR.ROBOT AI' },
  { href: '/admin/support', label: 'پشتیبانی' },
  { href: '/admin/appearance', label: 'ویرایشگر سایت' },
  { href: '/admin/discounts', label: 'تخفیف‌ها' },
  { href: '/admin/activity', label: 'گزارش فعالیت' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="admin-card hidden w-64 shrink-0 flex-col p-4 lg:flex">
      <SidebarBrand />
      <p className="mt-6 text-xs tracking-widest text-[#e10600]">CONTROL PANEL</p>
      <nav className="mt-4 flex flex-col gap-1">
        {links.map((l) => {
          const active =
            l.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`admin-sidebar-link ${active ? 'is-active' : ''}`}
            >
              {l.label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto pt-6 text-xs text-white/40">
        با مستر ربات فکرتو نذار
      </div>
    </aside>
  )
}

function SidebarBrand() {
  return (
    <div>
      <p className="text-lg font-bold" dir="ltr">
        MR.ROBOT
      </p>
      <p className="text-xs text-white/50">Admin Dashboard</p>
    </div>
  )
}
