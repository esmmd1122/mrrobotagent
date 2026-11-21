'use client'

import { ArrowLeft, Headphones, Layers, ShieldCheck } from 'lucide-react'
import type { WebsiteConfig } from '@/lib/site-config/types'
import { toFaDigits } from './product-helpers'

type Props = {
  hero: WebsiteConfig['hero']
  productCount: number
  categoryCount: number
  onOpenRequest: (subject: string) => void
}

export function Hero({
  hero,
  productCount,
  categoryCount,
  onOpenRequest,
}: Props) {
  const leadCopy =
    hero.subtitle && hero.subtitle.trim().length > 20
      ? hero.subtitle
      : 'مرجع تخصصی اشتراک‌های هوش مصنوعی، سرویس‌های امن VPN و V2Ray، خدمات اپل آیدی و آیکلود، تعمیرات تخصصی موبایل و محصولات دیجیتال — در تجربه‌ای شفاف، سریع و قابل اعتماد.'

  return (
    <section
      className="cinema-story-scene cinema-hero-scene"
      id="hero"
      data-scene="0"
    >
      <div className="cinema-container">
        <div className="cinema-split-hero">
          <div className="cinema-hero-panel-mobile">
            <div className="cinema-kicker">
              <span className="dot" />
              <span>{hero.slogan || 'دنیای فناوری دیجیتال و هوش مصنوعی'}</span>
              <span className="code">SCENE 01</span>
            </div>

            <h1 className="cinema-hero-heading">
              نسل نوین خدمات دیجیتال
              <br />
              با امضای{' '}
              <span className="cinema-title-accent cinema-brand-inline">
                MR.ROBOT
              </span>
            </h1>

            <p className="cinema-lead-text">{leadCopy}</p>

            <div className="cinema-cta-group">
              <a href="#marketplace" className="cinema-btn cinema-btn-signature">
                <span>ورود به فروشگاه سه‌بعدی</span>
                <ArrowLeft className="h-4 w-4" />
              </a>
              <a href="#services" className="cinema-btn cinema-btn-buy">
                مشاهده دسته‌بندی خدمات
              </a>
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
