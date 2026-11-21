'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ExternalLink, Menu, X } from 'lucide-react'

export const ADMIN_NAV_GROUPS = [
  {
    title: 'پلتفرم',
    items: [
      { href: '/admin', label: 'مرکز فرمان' },
      { href: '/admin/platform', label: 'سالن‌ها' },
      { href: '/admin/ai', label: 'هوش مصنوعی' },
    ],
  },
  {
    title: 'فروشگاه و سفارش‌ها',
    items: [
      { href: '/admin/products', label: 'محصولات' },
      { href: '/admin/orders', label: 'سفارش‌ها' },
      { href: '/admin/customers', label: 'مشتریان' },
      { href: '/admin/payments', label: 'پرداخت‌ها' },
      { href: '/admin/discounts', label: 'تخفیف‌ها' },
      { href: '/admin/categories', label: 'دسته‌بندی‌ها' },
    ],
  },
  {
    title: 'محتوا و سیستم',
    items: [
      { href: '/admin/appearance', label: 'محتوا و CMS سایت' },
      { href: '/admin/support', label: 'پشتیبانی' },
      { href: '/admin/admins', label: 'مدیران' },
      { href: '/admin/activity', label: 'رویدادها' },
    ],
  },
] as const

const MOBILE_QUICK_ITEMS = [
  { href: '/admin', label: 'داشبورد' },
  { href: '/admin/products', label: 'محصولات' },
  { href: '/admin/appearance', label: 'محتوا (CMS)' },
  { href: '/admin/orders', label: 'سفارش‌ها' },
  { href: '/admin/customers', label: 'مشتریان' },
] as const

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="admin-card hidden w-72 shrink-0 flex-col p-5 lg:flex">
      <div className="flex items-center gap-3">
        <img src="/images/mr-robot-character.png" alt="MR.ROBOT" className="mr-float h-14 w-14 object-contain" />
        <div>
          <p className="mr-kicker">MR.ROBOT AI</p>
          <p className="text-lg font-semibold" dir="ltr">
            Control
          </p>
        </div>
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-5" aria-label="منوی مدیریت">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-[11px] font-semibold text-[#9297A3]">{group.title}</p>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`admin-sidebar-link ${active ? 'is-active' : ''}`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <p className="pt-6 text-xs text-[#9297A3]">پنل مدیریت رسمی MR.ROBOT</p>
    </aside>
  )
}

export function AdminMobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'بستن منوی مدیریت' : 'باز کردن منوی مدیریت'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <p className="text-sm font-bold text-white" dir="ltr">
            MR.ROBOT Admin
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/80 hover:text-white"
        >
          <span>مشاهده سایت</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Quick Mobile Strip */}
      <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 text-xs">
        {MOBILE_QUICK_ITEMS.map((item) => {
          const active =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-md border px-2.5 py-1.5 font-medium transition ${
                active
                  ? 'border-[#e10600]/60 bg-[#e10600]/20 text-white'
                  : 'border-[#2a2b35] bg-white/[0.03] text-white/75'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Full Collapsible Mobile Menu Drawer covering all admin sections */}
      {open ? (
        <nav
          aria-label="منوی کامل مدیریت در موبایل"
          className="mt-3 max-h-[70vh] space-y-4 overflow-y-auto rounded-xl border border-white/12 bg-[#0c0e15] p-3.5 shadow-2xl"
        >
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 text-[11px] font-semibold text-[#9297A3]">{group.title}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.map((item) => {
                  const active =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-[38px] items-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        active
                          ? 'border-[#e10600]/60 bg-[#e10600]/20 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      ) : null}
    </div>
  )
}
