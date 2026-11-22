'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Cpu,
  MessageSquareCode,
  PhoneCall,
  Send,
  Sparkles,
  Workflow,
} from 'lucide-react'
import {
  AI_PROJECT_CATEGORIES,
  AI_PROJECT_PRICING_LABEL,
  type AIProjectCategoryId,
} from '@/lib/ai-projects'
import {
  computeActiveCarouselIndex,
  computeCarouselNavBounds,
  computeCarouselStep,
  resolveCarouselScrollDelta,
} from './carousel-helpers'

import {
  isNextImageCompatibleSrc,
  resolveSafeSectionImageUrl,
} from '@/lib/mascot-media'

const CATEGORY_ICONS: Record<AIProjectCategoryId, typeof Bot> = {
  'personal-ai-assistant': Bot,
  'business-ai-assistant': BriefcaseBusiness,
  'ai-phone-receptionist': PhoneCall,
  'ai-booking-system': CalendarClock,
  'business-automation': Workflow,
  'web-telegram-assistant': Send,
}

const ACCENT_STYLES = {
  cyan: {
    iconWrap: 'border-[#38bdf8]/35 bg-[#38bdf8]/12 text-[#38bdf8]',
    hoverBorder: 'hover:border-[#38bdf8]/55',
    engText: 'text-[#7dd3fc]/85',
  },
  violet: {
    iconWrap: 'border-[#8b5cf6]/35 bg-[#8b5cf6]/14 text-[#c4b5fd]',
    hoverBorder: 'hover:border-[#8b5cf6]/55',
    engText: 'text-[#c4b5fd]/85',
  },
  crimson: {
    iconWrap: 'border-[#ef1d42]/35 bg-[#ef1d42]/12 text-[#ff5c77]',
    hoverBorder: 'hover:border-[#ef1d42]/55',
    engText: 'text-[#fda4af]/85',
  },
} as const

type Props = {
  imageUrl?: string
  imageAlt?: string
  onStartProject: (categoryId?: AIProjectCategoryId) => void
  onOpenAssistant?: () => void
}

export function AIProjectBuilderSection({
  imageUrl,
  imageAlt,
  onStartProject,
  onOpenAssistant,
}: Props) {
  const mobileTrackRef = useRef<HTMLDivElement | null>(null)
  const [activeMobileIdx, setActiveMobileIdx] = useState(0)
  const [navBounds, setNavBounds] = useState({ canPrev: false, canNext: true })
  const resolvedImageUrl = resolveSafeSectionImageUrl(imageUrl)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [resolvedImageUrl])

  const syncMobileTrack = useCallback(() => {
    const el = mobileTrackRef.current
    if (!el) return
    setNavBounds(computeCarouselNavBounds(el.scrollLeft, el.scrollWidth, el.clientWidth))
    const firstCard = el.querySelector<HTMLElement>('[data-ai-card="true"]')
    const step = computeCarouselStep(el.clientWidth, firstCard?.offsetWidth ?? null, 14)
    const idx = computeActiveCarouselIndex(
      el.scrollLeft,
      el.scrollWidth,
      el.clientWidth,
      step,
      AI_PROJECT_CATEGORIES.length,
    )
    setActiveMobileIdx(idx)
  }, [])

  useEffect(() => {
    syncMobileTrack()
    window.addEventListener('resize', syncMobileTrack, { passive: true })
    return () => window.removeEventListener('resize', syncMobileTrack)
  }, [syncMobileTrack])

  const scrollMobileTrack = (direction: 'prev' | 'next') => {
    const el = mobileTrackRef.current
    if (!el) return
    const isRtl = getComputedStyle(el).direction === 'rtl'
    const firstCard = el.querySelector<HTMLElement>('[data-ai-card="true"]')
    const step = computeCarouselStep(el.clientWidth, firstCard?.offsetWidth ?? null, 14)
    const delta = resolveCarouselScrollDelta(direction, step, isRtl)
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const scrollToMobileIndex = (index: number) => {
    const el = mobileTrackRef.current
    if (!el) return
    const cards = el.querySelectorAll<HTMLElement>('[data-ai-card="true"]')
    cards[index]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  return (
    <section
      className="cinema-story-scene relative py-14 sm:py-20 lg:py-24"
      id="ai-builder"
      data-scene="2"
      data-testid="ai-project-builder-section"
    >
      {/* Keep legacy #services anchor reachable smoothly without showing old inactive cards */}
      <span id="services" className="sr-only" aria-hidden="true" />

      <div className="cinema-container relative">
        {/* Main Premium Container: Deep Black & Navy + Cyan/Violet Tech Glow + Restrained Crimson */}
        <div className="relative overflow-hidden rounded-3xl border border-[#38bdf8]/18 bg-[#050915]/94 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.68)] sm:p-8 lg:p-10">
          {/* Subtle animated technology grid & ambient highlights */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-65"
            style={{
              backgroundImage:
                'radial-gradient(620px 320px at 86% 12%, rgba(56, 189, 248, 0.14), transparent 68%), radial-gradient(520px 300px at 14% 18%, rgba(139, 92, 246, 0.16), transparent 66%), radial-gradient(460px 260px at 18% 92%, rgba(239, 29, 66, 0.11), transparent 70%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148, 163, 184, 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.5) 1px, transparent 1px)',
              backgroundSize: '42px 42px',
            }}
          />

          <div className="relative z-10 space-y-8 lg:space-y-10">
            {/* Top 2-Column Balanced Split (Desktop) / Stacked Clean Header (Mobile) */}
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
              {/* Primary Editorial & Conversion Column */}
              <div className="flex flex-col justify-between lg:col-span-7">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#7dd3fc]">
                    <Cpu className="h-4 w-4 text-[#38bdf8]" />
                    <span>معماری و ساخت سیستم‌های هوش مصنوعی اختصاصی</span>
                    <span aria-hidden="true" className="text-white/25">
                      ·
                    </span>
                    <span className="text-[#c4b5fd]">{AI_PROJECT_PRICING_LABEL}</span>
                  </div>

                  <h2 className="text-balance text-2xl font-black leading-[1.35] text-white sm:text-3xl lg:text-[2.25rem]">
                    <span dir="ltr" className="inline-block font-mono tracking-tight text-[#38bdf8]">
                      MR.ROBOT AI
                    </span>{' '}
                    — ایده‌ات را به یک سیستم هوشمند تبدیل کن
                  </h2>

                  <p className="mt-3.5 max-w-2xl text-sm leading-7 text-[#b7c7e2] sm:text-base">
                    از دستیارهای هوشمند تا اتوماسیون کسب‌وکار؛ راهکار هوش مصنوعی متناسب با نیاز خودت
                    بساز.
                  </p>

                  <p className="mt-3 max-w-2xl text-xs leading-6 text-[#8ea5cc] sm:text-sm">
                    تیم فنی MR.ROBOT فراتر از فروش اشتراک، ایجنت‌ها، ربات‌های پاسخ‌گو، منشی‌های
                    صوتی و گردش‌کارهای هوشمند اختصاصی را دقیقاً مطابق فرآیند کار یا کسب‌وکار شما
                    طراحی و پیاده‌سازی می‌کند.
                  </p>
                </div>

                {/* Primary & Secondary Action Bar */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    data-testid="ai-builder-primary-cta"
                    onClick={() => onStartProject('business-ai-assistant')}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#c81234] via-[#ef1d42] to-[#ef1d42] px-6 text-sm font-extrabold text-white shadow-[0_12px_32px_rgba(239,29,66,0.32)] transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>ساخت پروژه اختصاصی</span>
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  {onOpenAssistant ? (
                    <button
                      type="button"
                      onClick={onOpenAssistant}
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#38bdf8]/35 bg-[#0b1730]/85 px-5 text-sm font-semibold text-[#dbeafe] transition hover:border-[#38bdf8]/70 hover:bg-[#102246] hover:text-white"
                    >
                      <MessageSquareCode className="h-4 w-4 text-[#38bdf8]" />
                      <span>مشاوره سریع با MR.ROBOT AI</span>
                    </button>
                  ) : null}
                </div>

                {/* Clean 3-step Custom Build Summary (No fake fixed pricing) */}
                <div className="mt-6 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold text-[#38bdf8]">۰۱. ثبت نیاز واقعی</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#95abd0]">
                      نوع سیستم، امکانات و اتصالات مورد نظر را به فارسی مشخص می‌کنید.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#c4b5fd]">۰۲. تحلیل و برآورد شفاف</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#95abd0]">
                      پس از بررسی فنی، پیش‌فاکتور و زمان تحویل دقیق برای شما ارسال می‌شود.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#fda4af]">۰۳. پیاده‌سازی اختصاصی</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#95abd0]">
                      تنها پس از تأیید شما، پروژه طراحی، تست و با پشتیبانی تحویل داده می‌شود.
                    </p>
                  </div>
                </div>
              </div>

              {/* Official MR.ROBOT Mascot Visual Anchor Column */}
              <div className="flex flex-col lg:col-span-5">
                <div className="relative flex h-full min-h-[220px] flex-row items-center gap-4 overflow-hidden rounded-2xl border border-[#8b5cf6]/28 bg-[#080f22] p-4 sm:min-h-[260px] sm:p-5 lg:flex-col lg:justify-between">
                  {/* Subtle accent line */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-l from-[#ef1d42]/80 via-[#8b5cf6]/90 to-[#38bdf8]/80"
                  />

                  <div
                    data-testid="ai-builder-visual-frame"
                    className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-[#38bdf8]/30 bg-[#050914] shadow-[0_0_32px_rgba(56,189,248,0.14)] sm:h-36 sm:w-36 lg:h-52 lg:w-full"
                  >
                    {resolvedImageUrl && !imageFailed ? (
                      isNextImageCompatibleSrc(resolvedImageUrl) ? (
                        <Image
                          src={resolvedImageUrl}
                          alt={imageAlt?.trim() || 'تصویر اختصاصی بخش MR.ROBOT AI'}
                          fill
                          sizes="(max-width: 1024px) 144px, 440px"
                          className="object-cover object-center"
                          referrerPolicy="no-referrer"
                          onError={() => setImageFailed(true)}
                        />
                      ) : (
                        <img
                          src={resolvedImageUrl}
                          alt={imageAlt?.trim() || 'تصویر اختصاصی بخش MR.ROBOT AI'}
                          className="h-full w-full object-cover object-center"
                          referrerPolicy="no-referrer"
                          onError={() => setImageFailed(true)}
                        />
                      )
                    ) : (
                      <div
                        data-testid="ai-builder-image-placeholder"
                        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b152c] via-[#070c1b] to-[#140814] p-3 text-center"
                      >
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 opacity-30"
                          style={{
                            backgroundImage:
                              'radial-gradient(circle at 50% 42%, rgba(239, 29, 66, 0.28), transparent 62%), radial-gradient(circle at 20% 80%, rgba(56, 189, 248, 0.24), transparent 55%)',
                          }}
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 opacity-[0.09]"
                          style={{
                            backgroundImage:
                              'linear-gradient(to right, rgba(148, 163, 184, 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.6) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                          }}
                        />
                        <div className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#38bdf8]/40 bg-[#0b1936]/90 text-[#38bdf8] shadow-[0_0_24px_rgba(56,189,248,0.22)] sm:h-14 sm:w-14">
                            <Cpu className="h-5 w-5 sm:h-7 sm:w-7" />
                          </span>
                          <span
                            dir="ltr"
                            className="font-mono text-[10px] font-bold tracking-[0.18em] text-white/90 sm:text-xs"
                          >
                            MR.ROBOT AI
                          </span>
                          <span className="hidden text-[11px] text-[#95abd0] lg:inline">
                            معماری هوشمند و اختصاصی
                          </span>
                        </div>
                      </div>
                    )}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060b18]/65 via-transparent to-transparent"
                    />
                  </div>

                  <div className="min-w-0 flex-1 lg:w-full">
                    <p className="text-xs font-bold text-[#38bdf8]">
                      آزمایشگاه هوش مصنوعی MR.ROBOT
                    </p>
                    <p className="mt-1 text-sm font-extrabold leading-snug text-white">
                      طراحی و توسعه راهکارهای هوشمند متناسب با مقیاس کار شما
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#9bb0d4]">
                      تعرفه هر پروژه بر اساس امکانات و اتصالات انتخابی شما برآورد می‌شود؛ بدون
                      قیمت‌گذاری صوری یا پرداخت خودکار پیش از توافق.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 AI Project Categories Header + Mobile Controls */}
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-6">
                <div>
                  <h3 className="text-base font-extrabold text-white sm:text-lg">
                    ۶ راهکار اصلی ساخت پروژه هوش مصنوعی
                  </h3>
                  <p className="mt-1 text-xs text-[#91a7cc]">
                    روی هر دسته‌بندی کلیک کنید تا فرم پیکربندی اختصاصی همان پروژه باز شود.
                  </p>
                </div>

                {/* Mobile horizontal swipe arrows */}
                <div className="flex items-center gap-1.5 md:hidden" aria-label="پیمایش دسته‌بندی‌های پروژه">
                  <button
                    type="button"
                    onClick={() => scrollMobileTrack('prev')}
                    disabled={!navBounds.canPrev}
                    aria-label="دسته قبلی پروژه"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#0a1328] text-white transition disabled:opacity-35"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollMobileTrack('next')}
                    disabled={!navBounds.canNext}
                    aria-label="دسته بعدی پروژه"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#0a1328] text-white transition disabled:opacity-35"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Responsive Container: Horizontal Swipe Carousel on Mobile, Organized 2/3-Col Grid on Tablet/Desktop */}
              <div
                ref={mobileTrackRef}
                onScroll={syncMobileTrack}
                data-testid="ai-builder-categories-grid"
                className="cinema-carousel-track flex gap-3.5 pb-1 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible lg:grid-cols-3"
              >
                {AI_PROJECT_CATEGORIES.map((category, index) => {
                  const Icon = CATEGORY_ICONS[category.id]
                  const tone = ACCENT_STYLES[category.accent]

                  return (
                    <article
                      key={category.id}
                      data-ai-card="true"
                      data-testid={`ai-category-card-${category.id}`}
                      className={`group flex w-[82%] shrink-0 snap-start flex-col justify-between rounded-2xl border border-white/10 bg-[#091124]/92 p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-[#0d1833] md:w-auto ${tone.hoverBorder}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tone.iconWrap}`}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span
                            dir="ltr"
                            className="font-mono text-[11px] font-medium text-[#7086ad]"
                          >
                            0{index + 1}
                          </span>
                        </div>

                        <h4 className="mt-4 text-base font-extrabold text-white">
                          {category.titleFa}
                        </h4>
                        <p
                          dir="ltr"
                          className={`mt-0.5 text-right font-mono text-[11px] font-medium ${tone.engText}`}
                        >
                          {category.titleEn}
                        </p>

                        <p className="mt-2.5 text-xs leading-6 text-[#a8bad8]">
                          {category.shortDesc}
                        </p>
                      </div>

                      <div className="mt-5 space-y-3 border-t border-white/8 pt-4">
                        <p className="text-[11px] font-medium text-[#8ea5cc]">
                          {AI_PROJECT_PRICING_LABEL}
                        </p>

                        <button
                          type="button"
                          data-testid={`ai-category-cta-${category.id}`}
                          onClick={() => onStartProject(category.id)}
                          className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-white/14 bg-[#0f1c38] px-4 text-xs font-bold text-white transition group-hover:border-[#38bdf8]/55 group-hover:bg-[#14274d]"
                        >
                          <span>ساخت پروژه اختصاصی</span>
                          <ArrowLeft className="h-4 w-4 text-[#38bdf8] transition group-hover:-translate-x-0.5" />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              {/* Mobile Pagination Dots */}
              <div
                className="flex items-center justify-center gap-1.5 pt-1 md:hidden"
                role="group"
                aria-label="نشانگر دسته‌بندی‌های پروژه هوش مصنوعی"
              >
                {AI_PROJECT_CATEGORIES.map((category, idx) => {
                  const active = idx === activeMobileIdx
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => scrollToMobileIndex(idx)}
                      aria-label={`نمایش ${category.titleFa}`}
                      aria-current={active ? 'true' : undefined}
                      className={`h-2 rounded-full transition-all ${
                        active ? 'w-6 bg-[#38bdf8]' : 'w-2 bg-white/25'
                      }`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
