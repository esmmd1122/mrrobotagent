'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, ShoppingBag, Sparkles, User, X } from 'lucide-react'
import { useOptionalCart } from '@/components/cart/CartProvider'
import type { NavLinkConfig } from '@/lib/site-config/types'

const CINEMA_HOME_LINKS = [
  { id: 'intro', href: '#intro', label: 'هویت برند' },
  { id: 'ai-builder', href: '#ai-builder', label: 'پروژه هوش مصنوعی' },
  { id: 'marketplace', href: '#marketplace', label: 'فروشگاه سه‌بعدی' },
  { id: 'ai-experience', href: '#ai-experience', label: 'هوش مصنوعی' },
  { id: 'apple-mobile', href: '#apple-mobile', label: 'اپل و موبایل' },
  { id: 'trust', href: '#trust', label: 'اعتماد و پشتیبانی' },
] as const

const FALLBACK_LINKS: NavLinkConfig[] = [
  { id: 'home', href: '/', label: 'خانه', enabled: true },
  { id: 'shop', href: '/shop', label: 'فروشگاه', enabled: true },
  { id: 'chat', href: '/chat', label: 'هوش مصنوعی', enabled: true },
  { id: 'contact', href: '/contact', label: 'تماس با ما', enabled: true },
]

function toFaDigits(value: number) {
  return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

type Props = {
  links?: NavLinkConfig[]
  purchaseCta?: { label: string; href: string }
  cartCount?: number
}

export function Navbar({ links, cartCount = 0 }: Props) {
  const pathname = usePathname()
  const cart = useOptionalCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const isHome = pathname === '/'
  const bridge = cart?.cinemaBridge
  const liveCount = cart ? cart.count : cartCount
  const secondaryLinks = (links && links.length > 0 ? links : FALLBACK_LINKS).filter(
    (l) => l.enabled,
  )

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const handleOpenCart = () => {
    if (cart) {
      cart.openDrawer()
    }
  }

  if (pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <>
      <header className={`cinema-navbar ${scrolled ? 'is-scrolled' : ''}`}>
        <Link href={isHome ? '#hero' : '/'} className="cinema-brand">
          <span className="cinema-brand-icon" aria-hidden="true">
            <span className="cinema-brand-eyes">
              <span />
              <span />
            </span>
          </span>
          <span className="cinema-brand-wordmark">
            MR.<em>ROBOT</em>
          </span>
        </Link>

        <nav aria-label="منوی اصلی">
          <ul className="cinema-nav-links">
            {isHome
              ? CINEMA_HOME_LINKS.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.href}
                      className={bridge?.activeChapterId === item.id ? 'is-active' : ''}
                    >
                      {item.label}
                    </a>
                  </li>
                ))
              : secondaryLinks.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className={pathname === link.href ? 'is-active' : ''}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
          </ul>
        </nav>

        <div className="cinema-nav-actions">
          {isHome && bridge ? (
            <button
              type="button"
              className={`cinema-ctrl-pill cinema-desktop-only-pill ${
                !bridge.reducedMotion ? 'is-active' : ''
              }`}
              onClick={bridge.toggleReducedMotion}
              title="تغییر حالت حرکت سه‌بعدی"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{bridge.reducedMotion ? 'آرام' : 'سینمایی'}</span>
            </button>
          ) : null}

          <Link
            href="/account"
            className="cinema-ctrl-pill cinema-desktop-only-pill"
            aria-label="حساب کاربری"
          >
            <User className="h-3.5 w-3.5" />
            <span>حساب من</span>
          </Link>

          <button
            type="button"
            className="cinema-cart-trigger"
            onClick={handleOpenCart}
            aria-label="باز کردن سبد سفارش"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="cinema-cart-label-sm">سبد سفارش</span>
            <span className="cinema-cart-badge">{toFaDigits(liveCount)}</span>
          </button>

          <button
            type="button"
            className="cinema-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile RTL Navigation Drawer */}
      <div
        className={`cinema-backdrop ${menuOpen ? 'is-open' : ''}`}
        style={{ zIndex: 220 }}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />
      <aside
        className={`cinema-mobile-menu ${menuOpen ? 'is-open' : ''}`}
        aria-label="منوی موبایل"
        aria-hidden={!menuOpen}
      >
        <div className="cinema-drawer-head">
          <div className="flex items-center gap-2.5">
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
          <button
            type="button"
            className="cinema-icon-close"
            onClick={() => setMenuOpen(false)}
            aria-label="بستن منو"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-4" aria-label="لینک‌های موبایل">
          {isHome
            ? CINEMA_HOME_LINKS.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex min-h-[44px] items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    bridge?.activeChapterId === item.id
                      ? 'border border-[#38bdf8]/40 bg-[#122650] text-white'
                      : 'text-[#a8bad8] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                </a>
              ))
            : secondaryLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[44px] items-center rounded-xl px-4 py-2.5 text-sm font-medium text-[#a8bad8] hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}

          <div className="my-2 border-t border-[#7ea8ff]/15" />

          <Link
            href="/shop"
            onClick={() => setMenuOpen(false)}
            className="flex min-h-[44px] items-center rounded-xl px-4 py-2.5 text-sm font-medium text-[#dbeafe] hover:bg-white/5"
          >
            فروشگاه کامل محصولات
          </Link>
          <Link
            href="/account"
            onClick={() => setMenuOpen(false)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[#dbeafe] hover:bg-white/5"
          >
            <User className="h-4 w-4 text-[#38bdf8]" />
            <span>حساب کاربری و سفارش‌ها</span>
          </Link>
          <Link
            href="/cart"
            onClick={() => setMenuOpen(false)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[#dbeafe] hover:bg-white/5"
          >
            <ShoppingBag className="h-4 w-4 text-[#38bdf8]" />
            <span>سبد خرید ({toFaDigits(liveCount)})</span>
          </Link>
          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
            className="flex min-h-[44px] items-center rounded-xl px-4 py-2.5 text-sm font-medium text-[#a8bad8] hover:bg-white/5 hover:text-white"
          >
            تماس و پشتیبانی
          </Link>
        </nav>

        {isHome && bridge ? (
          <div className="border-t border-[#7ea8ff]/15 p-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                bridge.toggleReducedMotion()
              }}
              className="cinema-btn cinema-btn-subtle cinema-btn-sm w-full"
            >
              <Sparkles className="h-4 w-4 text-[#38bdf8]" />
              <span>
                حالت حرکت سه‌بعدی: {bridge.reducedMotion ? 'آرام' : 'سینمایی'}
              </span>
            </button>
          </div>
        ) : null}
      </aside>
    </>
  )
}
