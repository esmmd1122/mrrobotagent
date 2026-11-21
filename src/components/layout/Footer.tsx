import Link from 'next/link'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import type { NavLinkConfig, WebsiteConfig } from '@/lib/site-config/types'
import { safeCmsHref } from '@/lib/site-config/cms-helpers'

type Props = {
  config: WebsiteConfig['footer']
  quickLinks: NavLinkConfig[]
}

export function Footer({ config, quickLinks }: Props) {
  const links = quickLinks.filter((l) => l.enabled)
  const socials = [
    { key: 'telegram', label: 'تلگرام', href: config.social.telegram },
    { key: 'instagram', label: 'اینستاگرام', href: config.social.instagram },
    { key: 'twitter', label: 'ایکس (X)', href: config.social.twitter },
  ]
    .filter((s) => Boolean(s.href?.trim()))
    .map((s) => ({ ...s, safeHref: safeCmsHref(s.href, '#') }))
    .filter((s) => s.safeHref !== '#')

  const hasContactInfo = Boolean(
    config.contactPhone?.trim() ||
      config.contactEmail?.trim() ||
      config.contactAddress?.trim() ||
      config.supportHours?.trim(),
  )

  return (
    <footer className="cinema-footer">
      <div className="cinema-container px-5 py-12 sm:px-7">
        <div className="grid gap-10 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="cinema-brand-icon" aria-hidden="true">
                <span className="cinema-brand-eyes">
                  <span />
                  <span />
                </span>
              </span>
              <span className="cinema-brand-wordmark">
                MR.<em>ROBOT</em>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#a8bad8]">
              {config.tagline}
            </p>
            {socials.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
                {socials.map((s) => (
                  <li key={s.key}>
                    <a
                      href={s.safeHref}
                      className="inline-flex min-h-[36px] items-center rounded-lg border border-[#7ea8ff]/20 bg-[#0b162e]/80 px-3 text-[#38bdf8] transition hover:border-[#38bdf8]/50 hover:text-white"
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
            <p className="text-sm font-bold text-white">{config.columnTitleLinks}</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2.5 text-sm text-[#a8bad8]">
              {links.map((l) => (
                <li key={l.id}>
                  <Link
                    href={safeCmsHref(l.href, '/')}
                    className="transition hover:text-[#38bdf8]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/shop" className="transition hover:text-[#38bdf8]">
                  فروشگاه کامل
                </Link>
              </li>
              <li>
                <Link href="/account" className="transition hover:text-[#38bdf8]">
                  حساب کاربری
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-bold text-white">{config.columnTitleFuture}</p>
            <p className="mt-4 text-sm leading-relaxed text-[#a8bad8]">
              {config.futureText}
            </p>

            {hasContactInfo ? (
              <ul className="mt-4 space-y-2 text-xs text-[#a8bad8]">
                {config.contactPhone?.trim() ? (
                  <li className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#e10600]" />
                    <a
                      href={`tel:${config.contactPhone.trim()}`}
                      dir="ltr"
                      className="hover:text-white"
                    >
                      {config.contactPhone.trim()}
                    </a>
                  </li>
                ) : null}
                {config.contactEmail?.trim() ? (
                  <li className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-[#e10600]" />
                    <a
                      href={`mailto:${config.contactEmail.trim()}`}
                      dir="ltr"
                      className="hover:text-white"
                    >
                      {config.contactEmail.trim()}
                    </a>
                  </li>
                ) : null}
                {config.supportHours?.trim() ? (
                  <li className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]" />
                    <span>{config.supportHours.trim()}</span>
                  </li>
                ) : null}
                {config.contactAddress?.trim() ? (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]" />
                    <span>{config.contactAddress.trim()}</span>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#7ea8ff]/15 pt-6 text-xs text-[#7c92b8]">
          <div>
            © {new Date().getFullYear()} <span className="cinema-brand-inline text-white/90">MR.ROBOT</span> — تمامی حقوق محفوظ است.
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/#services" className="transition hover:text-[#38bdf8]">
              خدمات
            </Link>
            <Link href="/#marketplace" className="transition hover:text-[#38bdf8]">
              فروشگاه سه‌بعدی
            </Link>
            <Link href="/#ai-experience" className="transition hover:text-[#38bdf8]">
              هوش مصنوعی
            </Link>
            <Link href="/#apple-mobile" className="transition hover:text-[#38bdf8]">
              اپل و موبایل
            </Link>
            <Link href="/contact" className="transition hover:text-[#38bdf8]">
              پشتیبانی
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
