import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioSession } from '@/modules/salon/auth'
import '@/app/admin/admin.css'

const links = [
  ['/studio', 'نمای کلی'],
  ['/studio/calendar', 'تقویم'],
  ['/studio/schedule', 'برنامه زمانی'],
  ['/studio/services', 'خدمات'],
  ['/studio/team', 'پرسنل'],
  ['/studio/customers', 'مشتریان'],
  ['/studio/settings', 'تنظیمات'],
  ['/studio/agent', 'ایجنت پذیرش'],
  ['/studio/agent/connections', 'اتصال ایجنت‌ها'],
  ['/studio/agent/guide', 'راهنمای ایجنت'],
]

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await getStudioSession()
  if (!session) redirect('/studio/login')
  return (
    <div className="mr-studio" dir="rtl">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-3 py-4 md:flex-row md:gap-6 md:p-6">
        <nav className="flex gap-2 overflow-x-auto md:hidden">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="admin-sidebar-link shrink-0 text-xs">
              {label}
            </Link>
          ))}
        </nav>
        <aside className="admin-card hidden w-64 shrink-0 p-5 md:block">
          <div className="flex items-center gap-3">
            <img src="/images/mr-robot-character.png" alt="" className="h-12 w-12 object-contain" />
            <div>
              <p className="mr-kicker">SALON OS</p>
              <p className="text-sm">{session.name}</p>
            </div>
          </div>
          <nav className="mt-6 flex flex-col gap-1">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="admin-sidebar-link">
                {label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="mt-8">
            <button className="text-xs text-[#9297A3]">خروج</button>
          </form>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

async function logout() {
  'use server'
  const { clearStudioCookie } = await import('@/modules/salon/auth')
  const { redirect } = await import('next/navigation')
  await clearStudioCookie()
  redirect('/studio/login')
}
