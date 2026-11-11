'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import type { WebsiteConfig } from '@/lib/site-config/types'

export function Hero({ hero }: { hero: WebsiteConfig['hero'] }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const yChar = useTransform(scrollYProgress, [0, 1], [0, 80])
  const yBg = useTransform(scrollYProgress, [0, 1], [0, 40])
  const opacityFade = useTransform(scrollYProgress, [0, 0.8], [1, 0.3])

  if (!hero.enabled) return null

  const btnRadius = { borderRadius: 'var(--site-btn-radius, 12px)' }

  return (
    <section
      id="home"
      ref={ref}
      className="relative min-h-[100svh] overflow-hidden pt-16"
    >
      <motion.div style={{ y: yBg }} className="absolute inset-0 -z-20">
        <Image
          src={hero.cinematicBgUrl}
          alt=""
          fill
          priority
          className="object-cover object-[center_30%] opacity-35"
          sizes="100vw"
        />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-mr-black/40 via-mr-black/85 to-mr-black" />
      <div className="section-glow absolute inset-x-0 top-0 h-64 -z-10 pointer-events-none" />

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-8 lg:pb-16 lg:pt-10">
        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-medium tracking-[0.2em] text-mr-red">{hero.brandLabel}</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl lg:text-6xl" dir="ltr">
            MR.ROBOT
          </h1>
          <p className="mt-5 text-xl font-semibold text-white sm:text-2xl text-balance">
            {hero.slogan}
          </p>
          <p className="mt-3 text-base text-mr-muted sm:text-lg">{hero.subtitle}</p>
          {hero.description ? (
            <p className="mt-3 text-sm text-mr-muted">{hero.description}</p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              href={hero.ctaPrimary.href}
              variant="primary"
              className="w-full sm:w-auto text-base px-8 py-4"
              style={btnRadius}
            >
              {hero.ctaPrimary.label}
            </Button>
            <Button
              href={hero.ctaSecondary.href}
              variant="secondary"
              className="w-full sm:w-auto text-base px-8 py-4"
              style={btnRadius}
            >
              {hero.ctaSecondary.label}
            </Button>
          </div>
        </motion.div>

        <motion.div
          style={{ y: yChar, opacity: opacityFade }}
          className="relative mx-auto w-full max-w-md lg:col-span-7 lg:max-w-none"
        >
          <div className="relative aspect-[4/5] w-full max-h-[min(72vh,640px)] sm:aspect-[3/4] lg:ml-8">
            <Image
              src={hero.characterImageUrl}
              alt="شخصیت MR.ROBOT"
              fill
              priority
              className="object-contain object-bottom drop-shadow-[0_32px_64px_rgba(0,0,0,0.65)]"
              sizes="(max-width: 768px) 90vw, 50vw"
            />
            <div
              className="pointer-events-none absolute left-[34%] top-[22%] h-5 w-8 rounded-full bg-mr-red/50 blur-md eye-pulse"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-[48%] top-[22%] h-5 w-8 rounded-full bg-mr-red/50 blur-md eye-pulse"
              style={{ animationDelay: '0.4s' }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-mr-black to-transparent" />
          </div>
        </motion.div>
      </div>

      {hero.showSectionPreviews ? (
        <motion.div
          className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 pb-12 sm:grid-cols-2 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          <Link
            href="/#subscriptions"
            className="group card-shop flex items-center justify-between gap-4 p-5 transition hover:border-mr-red/35"
          >
            <div>
              <p className="text-xs text-mr-red">بخش ۰۱</p>
              <p className="mt-1 font-bold">خرید اشتراک‌های دیجیتال</p>
              <p className="mt-1 text-sm text-mr-muted">ChatGPT، CapCut، Grok، Gemini</p>
            </div>
            <span className="text-mr-muted transition group-hover:text-mr-red">←</span>
          </Link>
          <Link
            href="/#ai"
            className="group card-ai flex items-center justify-between gap-4 p-5 transition hover:border-mr-red/50"
          >
            <div>
              <p className="text-xs text-mr-red" dir="ltr">
                MR.ROBOT AI
              </p>
              <p className="mt-1 font-bold">راهکارهای هوشمند</p>
              <p className="mt-1 text-sm text-mr-muted">اتوماسیون، ربات، دستیار اختصاصی</p>
            </div>
            <span className="text-mr-muted transition group-hover:text-mr-red">←</span>
          </Link>
        </motion.div>
      ) : null}
    </section>
  )
}
