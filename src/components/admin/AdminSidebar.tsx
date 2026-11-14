'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const groups = [
  {
    title: 'پلتفرم',
    items: [
      { href: '/admin', label: 'مرکز فرمان' },
      { href: '/admin/platform', label: 'سالن‌ها' },
      { href: '/admin/ai', label: 'هوش مصنوعی' },
    ],
  },
  {
    title: 'تجارت',
    items: [
      { href: '/admin/products', label: 'محصولات' },
      { href: '/admin/orders', label: 'سفارش‌ها' },
      { href: '/admin/customers', label: 'مشتریان' },
      { href: '/admin/payments', label: 'پرداخت‌ها' },
      { href: '/admin/discounts', label: 'تخفیف‌ها' },
      { href: '/admin/categories', label: 'دسته‌ها' },
    ],
  },
  {
    title: 'سیستم',
    items: [
      { href: '/admin/admins', label: 'مدیران' },
      { href: '/admin/support', label: 'پشتیبانی' },
      { href: '/admin/appearance', label: 'هویت سایت' },
      { href: '/admin/activity', label: 'رویدادها' },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="admin-card hidden w-72 shrink-0 flex-col p-5 lg:flex">
      <div className="flex items-center gap-3">
        <img src="/images/mr-robot-character.png" alt="" className="mr-float h-14 w-14 object-contain" />
        <div>
          <p className="mr-kicker">MR.ROBOT AI</p>
          <p className="text-lg font-semibold" dir="ltr">Control</p>
        </div>
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-5">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-[11px] text-[#9297A3]">{group.title}</p>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} className={`admin-sidebar-link ${active ? 'is-active' : ''}`}>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <p className="pt-6 text-xs text-[#9297A3]">با مستر ربات فکرتو نذار</p>
    </aside>
  )
}
