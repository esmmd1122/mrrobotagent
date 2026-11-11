'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import type { NavLinkConfig } from '@/lib/site-config/types'

const fallbackLinks: NavLinkConfig[] = [
  { id: 'home', href: '/#home', label: 'خانه', enabled: true },
  { id: 'subs', href: '/#subscriptions', label: 'اشتراک‌های دیجیتال', enabled: true },
  { id: 'ai', href: '/#ai', label: 'MR.ROBOT AI', enabled: true },
  { id: 'contact', href: '/contact', label: 'تماس', enabled: true },
]

type Props = {
  links?: NavLinkConfig[]
  purchaseCta?: { label: string; href: string }
}

export function Navbar({ links, purchaseCta }: Props) {
  const navLinks = (links || fallbackLinks).filter((l) => l.enabled)
  const cta = purchaseCta || { label: 'خرید اشتراک', href: '/#subscriptions' }

  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-shadow ${scrolled ? 'glass-nav shadow-lg shadow-black/40' : 'bg-transparent'}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[4.25rem] sm:px-6 lg:px-8">
        <Link
          href="/#home"
          className="group flex items-center gap-2 text-sm font-bold tracking-wide sm:text-base"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-mr-red shadow-[0_0_12px_var(--color-mr-red-glow)]" />
          <span dir="ltr">MR.ROBOT</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="منوی اصلی">
          {navLinks.map((link) => (
            <NavItem key={link.id} link={link} />
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button
            href={cta.href}
            variant="primary"
            className="!py-2.5 !px-5 text-sm"
            style={{ borderRadius: 'var(--site-btn-radius, 12px)' }}
          >
            {cta.label}
          </Button>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-mr-border bg-mr-surface/60 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'بستن منو' : 'باز کردن منو'}
        >
          <span className="sr-only">{open ? 'بستن' : 'منو'}</span>
          <div className="flex flex-col gap-1.5">
            <span className={`block h-0.5 w-5 bg-white transition ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-5 bg-white transition ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-white transition ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </div>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-mr-border bg-mr-charcoal/95 backdrop-blur-xl lg:hidden"
          >
            <nav className="flex flex-col gap-1 p-4" aria-label="منوی موبایل">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm text-white/90 hover:bg-white/5"
                >
                  {link.label}
                </Link>
              ))}
              <Button href={cta.href} variant="primary" className="mt-2 w-full">
                {cta.label}
              </Button>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}

function NavItem({ link }: { link: NavLinkConfig }) {
  const hasChildren = link.children && link.children.filter((c) => c.enabled).length > 0
  if (!hasChildren) {
    return (
      <Link
        href={link.href}
        className="rounded-lg px-3 py-2 text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
      >
        {link.label}
      </Link>
    )
  }
  return (
    <div className="group relative">
      <Link
        href={link.href}
        className="rounded-lg px-3 py-2 text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
      >
        {link.label}
      </Link>
      <div className="invisible absolute right-0 top-full z-50 min-w-[180px] rounded-xl border border-mr-border bg-mr-charcoal py-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
        {link.children
          ?.filter((c) => c.enabled)
          .map((child) => (
            <Link
              key={child.id}
              href={child.href}
              className="block px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              {child.label}
            </Link>
          ))}
      </div>
    </div>
  )
}
