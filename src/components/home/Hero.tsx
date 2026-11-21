'use client'

import Link from 'next/link'
import { ArrowLeft, Headphones, Layers, Megaphone, ShieldCheck } from 'lucide-react'
import type { WebsiteConfig } from '@/lib/site-config/types'
import { safeCmsHref } from '@/lib/site-config/cms-helpers'
import { toFaDigits } from './product-helpers'

type Props = {
  hero: WebsiteConfig['hero']
  productCount: number
  categoryCount: number
  onOpenRequest: (subject: string) => void
}

function HeroCtaLink({
  href,
  className,
  children,
}: {
  href: string
  className: string
  children: React.ReactNode
}) {
  const safe = safeCmsHref(href, '#marketplace')
  if (safe.startsWith('#')) {
    return (
      <a href={safe} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={safe} className={className}>
      {children}
    </Link>
  )
}

export function Hero({
  hero,
  productCount,
  categoryCount,
  onOpenRequest,
}: Props) {
  const leadCopy =
    hero.subtitle && hero.subtitle.trim().length > 10
      ? hero.subtitle
      : 'مرجع تخصصی اشتراک‌های هوش مصنوعی، سرویس‌های امن VPN و V2Ray، خدمات اپل آیدی و آیکلود، تعمیرات تخصصی موبایل و محصولات دیجیتال — در تجربه‌ای شفاف، سریع و قابل اعتماد.'

  const customHeadline = hero.headline?.trim()
  const primaryLabel = hero.ctaPrimary?.label?.trim() || 'ورود به فروشگاه سه‌بعدی'
  const primaryHref = hero.ctaPrimary?.href?.trim() || '#marketplace'
  const secondaryLabel = hero.ctaSecondary?.label?.trim() || 'مشاهده دسته‌بندی خدمات'
  const secondaryHref = hero.ctaSecondary?.href?.trim() || '#services'
  const showAnnouncement = Boolean(hero.announcementEnabled && hero.announcementText?.trim())

  return (
    <section
      className="cinema-story-scene cinema-hero-scene"
      id="hero"
      data-scene="0"
    >
      <div className="cinema-container">
        <div className="cinema-split-hero">
          <div className="cinema-hero-panel-mobile">
            {showAnnouncement ? (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[#e10600]/45 bg-[#e10600]/12 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-sm">
                <Megaphone className="h-3.5 w-3.5 shrink-0 text-[#ff4d48]" />
                <span>{hero.announcementText}</span>
              </div>
            ) : null}

            <div className="cinema-kicker">
              <span className="dot" />
              <span>{hero.slogan || 'دنیای فناوری دیجیتال و هوش مصنوعی'}</span>
              <span className="code">SCENE 01</span>
            </div>

            {customHeadline ? (
              <h1 className="cinema-hero-heading">{customHeadline}</h1>
            ) : (
              <h1 className="cinema-hero-heading">
                نسل نوین خدمات دیجیتال
                <br />
                با امضای{' '}
                <span className="cinema-title-accent cinema-brand-inline">
                  MR.ROBOT
                </span>
              </h1>
            )}

            <p className="cinema-lead-text">{leadCopy}</p>
            {hero.description?.trim() ? (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#9cb2d6]">
                {hero.description}
              </p>
            ) : null}

            {hero.bannerImageUrl?.trim() ? (
              <div className="mt-5 max-w-lg overflow-hidden rounded-xl border border-white/15 bg-black/40 shadow-lg">
                <div className="aspect-[16/7] w-full overflow-hidden">
                  <img
                    src={hero.bannerImageUrl}
                    alt={hero.bannerAlt || customHeadline || hero.slogan}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            ) : null}

            <div className="cinema-cta-group">
              <HeroCtaLink
                href={primaryHref}
                className="cinema-btn cinema-btn-signature"
              >
                <span>{primaryLabel}</span>
                <ArrowLeft className="h-4 w-4" />
              </HeroCtaLink>
              <HeroCtaLink
                href={secondaryHref}
                className="cinema-btn cinema-btn-buy"
              >
                {secondaryLabel}
              </HeroCtaLink>
              <button
                type="button"
                className="cinema-btn cinema-btn-subtle"
                onClick={() => onOpenRequest('مشاوره و ثبت درخواست اختصاصی')}
              >
                درخواست مشاوره
              </button>
            </div>

            <div className="cinema-hero-meta-strip">
              <div className="cinema-meta-tile">
                <strong className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>
                    {productCount > 0
                      ? `${toFaDigits(productCount)} سرویس فعال`
                      : 'فروشگاه یکپارچه'}
                  </span>
                </strong>
                <span>
                  {categoryCount > 0
                    ? `در ${toFaDigits(categoryCount)} دسته‌بندی تخصصی با تعرفه شفاف`
                    : 'تعرفه واقعی و محاسبه‌شده در سرور'}
                </span>
              </div>

              <div className="cinema-meta-tile">
                <strong className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>پیگیری سفارش در پنل</span>
                </strong>
                <span>تحویل فایل‌ها و وضعیت سفارش در حساب کاربری</span>
              </div>

              <div className="cinema-meta-tile">
                <strong className="flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5 text-[#ef1d42]" />
                  <span>پشتیبانی تیکتی مستقیم</span>
                </strong>
                <span>ثبت درخواست و همراهی کارشناس واقعی</span>
              </div>
            </div>
          </div>

          {/* Left side frames the official clickable 3D MR.ROBOT mascot completely unobstructed */}
          <div className="cinema-hero-spacer hidden min-h-[420px] lg:block" aria-hidden="true" />
        </div>
      </div>

      <div className="cinema-scroll-indicator" aria-hidden="true">
        <span>برای ادامه داستان اسکرول کنید</span>
        <div className="cinema-scroll-line" />
      </div>
    </section>
  )
}
