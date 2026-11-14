import Link from 'next/link'

const links = [
  { href: '/account', label: 'خلاصه' },
  { href: '/account/orders', label: 'سفارش‌ها' },
  { href: '/account/notifications', label: 'اعلان‌ها' },
  { href: '/account/profile', label: 'پروفایل' },
]

type Props = { unread?: number }

export function AccountNav({ unread = 0 }: Props) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-mr-border pb-3 text-sm">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-lg border border-mr-border px-3 py-1.5 hover:bg-white/5"
        >
          {l.label}
          {l.href === '/account/notifications' && unread > 0 ? (
            <span className="mr-1 rounded-full bg-mr-red px-1.5 text-[10px]">{unread}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  )
}