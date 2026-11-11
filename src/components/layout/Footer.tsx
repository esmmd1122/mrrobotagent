import Link from 'next/link'
import type { NavLinkConfig, WebsiteConfig } from '@/lib/site-config/types'

type Props = {
  config: WebsiteConfig['footer']
  quickLinks: NavLinkConfig[]
}

export function Footer({ config, quickLinks }: Props) {
  const links = quickLinks.filter((l) => l.enabled)
  const socials = [
    { key: 'telegram', label: 'Telegram', href: config.social.telegram },
    { key: 'instagram', label: 'Instagram', href: config.social.instagram },
    { key: 'twitter', label: 'X', href: config.social.twitter },
  ].filter((s) => s.href)

  return (
    <footer className="border-t border-mr-border bg-mr-charcoal">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <p className="text-lg font-bold" dir="ltr">
            MR.ROBOT
          </p>
          <p className="mt-3 text-sm text-mr-muted leading-relaxed">{config.tagline}</p>
          {socials.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-3 text-sm">
              {socials.map((s) => (
                <li key={s.key}>
                  <a
                    href={s.href}
                    className="text-mr-red hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{config.columnTitleLinks}</p>
          <ul className="mt-4 space-y-2 text-sm text-mr-muted">
            {links.map((l) => (
              <li key={l.id}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{config.columnTitleFuture}</p>
          <p className="mt-4 text-sm text-mr-muted leading-relaxed">{config.futureText}</p>
        </div>
      </div>
      <div className="border-t border-mr-border py-6 text-center text-xs text-mr-muted">
        © {new Date().getFullYear()} MR.ROBOT — تمامی حقوق محفوظ است.
      </div>
    </footer>
  )
}
