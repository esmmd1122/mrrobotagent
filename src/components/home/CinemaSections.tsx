'use client'

import Link from 'next/link'
import {
  Bot,
  FileCheck2,
  Headphones,
  Layers,
  Lock,
  Shield,
  ShoppingBag,
  Smartphone,
  Wrench,
} from 'lucide-react'
import { useCart } from '@/components/cart/CartProvider'
import type { StorefrontProduct } from '@/lib/mappers/product'
import {
  findMatchingProduct,
  formatProductPriceLabel,
  toFaDigits,
} from './product-helpers'

export function BrandIntroSection() {
  return (
    <section className="cinema-story-scene" id="intro" data-scene="1">
      <div className="cinema-container">
        <div className="cinema-split-intro">
          {/* Right side frames MR.ROBOT interacting with floating holographic core on desktop */}
          <div className="cinema-stage-spacer" aria-hidden="true" />

          <div>
            <div className="cinema-kicker">
              <span className="dot" />
              <span>هویت و فلسفه برند</span>
              <span className="code">SCENE 02</span>
            </div>

            <h2 className="cinema-section-heading">
              تخصص فنی عمیق، در کنار{' '}
              <span className="cinema-title-accent">تجربه خریدی ساده و مطمئن</span>
            </h2>

            <p className="cinema-lead-text">
              در <span className="cinema-brand-inline">MR.ROBOT</span> پیچیدگی‌های فنی دنیای
              سایبری و ابزارهای جهانی به خدماتی شفاف، امن و قابل دسترس تبدیل می‌شوند؛ تا هر
              کاربر بدون دغدغه به بهترین فناوری‌های روز متصل شود.
            </p>

            <div className="cinema-identity-pillars">
              <div className="cinema-pillar-box">
                <span className="cinema-pillar-num">01</span>
                <h3>شفافیت کامل در خرید</h3>
                <p>
                  معرفی دقیق هر سرویس، پلن‌های قابل انتخاب و قیمت واقعی محاسبه‌شده توسط سرور
                  پیش از ثبت نهایی سفارش.
                </p>
              </div>
              <div className="cinema-pillar-box">
                <span className="cinema-pillar-num">02</span>
                <h3>امنیت و حریم خصوصی</h3>
                <p>
                  تمرکز بر اتصال پایدار، ساختار امن و حفظ کامل اطلاعات و سوابق سفارش کاربران در
                  حساب اختصاصی.
                </p>
              </div>
              <div className="cinema-pillar-box">
                <span className="cinema-pillar-num">03</span>
                <h3>تخصص سخت‌افزار و نرم‌افزار</h3>
                <p>
                  پوشش یکپارچه از اشتراک‌های هوش مصنوعی تا خدمات تخصصی اکوسیستم اپل و تعمیرات
                  موبایل.
                </p>
              </div>
              <div className="cinema-pillar-box">
                <span className="cinema-pillar-num">04</span>
                <h3>همراهی کارشناس واقعی</h3>
                <p>
                  ارتباط مستقیم با تیم فنی از طریق سیستم تیکتینگ برای راهنمایی نصب، عیب‌یابی و
                  انتخاب بهترین سرویس.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ServicesOverviewSection({
  products,
  onInspectProduct,
  onOpenRequest,
}: {
  products: StorefrontProduct[]
  onInspectProduct: (product: StorefrontProduct) => void
  onOpenRequest: (subject: string) => void
}) {
  const { addItem, isLoading } = useCart()

  const aiProduct =
    findMatchingProduct(products, /chatgpt|openai|gemini|claude|ai|gpt|cursor|copilot/) ??
    products[0]
  const vpnProduct = findMatchingProduct(products, /vpn|v2ray|wireguard|proxy|network/)
  const appleProduct = findMatchingProduct(products, /apple|icloud|iphone|ios/)
  const digitalProduct =
    findMatchingProduct(products, /spotify|netflix|youtube|telegram|license|digital|xbox|psn/) ??
    products.find((p) => p.id !== aiProduct?.id && p.id !== vpnProduct?.id)

  const aiPrice = aiProduct ? formatProductPriceLabel(aiProduct) : null
  const vpnPrice = vpnProduct ? formatProductPriceLabel(vpnProduct) : null
  const applePrice = appleProduct ? formatProductPriceLabel(appleProduct) : null
  const digitalPrice = digitalProduct ? formatProductPriceLabel(digitalProduct) : null

  return (
    <section className="cinema-story-scene" id="services" data-scene="2">
      <div className="cinema-container">
        <div className="cinema-centered-intro">
          <div className="cinema-kicker">
            <span className="dot" />
            <span>ویترین خدمات تخصصی</span>
            <span className="code">SCENE 03</span>
          </div>
          <h2 className="cinema-section-heading">
            تمام نیازهای دیجیتال شما در{' '}
            <span className="cinema-title-accent">یک مجموعه یکپارچه</span>
          </h2>
          <p className="cinema-lead-text">
            دسته‌بندی مورد نظر خود را انتخاب کنید تا جزئیات سرویس را ببینید، به سبد سفارش اضافه
            کنید یا درخواست اختصاصی ثبت نمایید.
          </p>
        </div>

        <div className="cinema-services-bento">
          {/* 1. AI Accounts & Subscriptions */}
          <article className="cinema-navy-card cinema-service-card span-6">
            <div>
              <div className="cinema-service-head">
                <div className="cinema-service-glyph">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="cinema-service-tag featured">پرمخاطب</span>
              </div>
              <h3>اکانت‌ها و اشتراک‌های هوش مصنوعی</h3>
              <p>
                تهیه و فعال‌سازی اشتراک ابزارهای پیشرو هوش مصنوعی برای برنامه‌نویسی، طراحی،
                پژوهش و تولید محتوا با راهنمای کامل استفاده.
              </p>
            </div>
            <div className="cinema-service-foot">
              <span className="cinema-price-chip">
                {aiPrice ? aiPrice.label : 'تعرفه در فروشگاه'}
              </span>
              <div className="cinema-cta-group">
                {aiProduct && aiPrice?.purchasable ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() =>
                      void addItem(aiProduct.id, 1, aiPrice.planId, {
                        label: aiProduct.name,
                      })
                    }
                    className="cinema-btn cinema-btn-buy cinema-btn-sm"
                  >
                    افزودن به سفارش
                  </button>
                ) : (
                  <Link href="/shop" className="cinema-btn cinema-btn-buy cinema-btn-sm">
                    مشاهده پلن‌ها
                  </Link>
                )}
                <a href="#ai-experience" className="cinema-btn cinema-btn-subtle cinema-btn-sm">
                  انتخاب هوشمند
                </a>
              </div>
            </div>
          </article>

          {/* 2. VPN & V2Ray */}
          <article className="cinema-navy-card cinema-service-card span-6">
            <div>
              <div className="cinema-service-head">
                <div className="cinema-service-glyph">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="cinema-service-tag">اتصال امن</span>
              </div>
              <h3>سرویس‌های VPN و V2Ray</h3>
              <p>
                کانفیگ‌های اختصاصی و پایدار V2Ray و سرویس‌های VPN با راه‌اندازی آسان روی iOS،
                اندروید، ویندوز و مک‌او‌اس.
              </p>
            </div>
            <div className="cinema-service-foot">
              <span className="cinema-price-chip">
                {vpnPrice ? vpnPrice.label : 'ثبت درخواست اختصاصی'}
              </span>
              <div className="cinema-cta-group">
                {vpnProduct && vpnPrice?.purchasable ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() =>
                      void addItem(vpnProduct.id, 1, vpnPrice.planId, {
                        label: vpnProduct.name,
                      })
                    }
                    className="cinema-btn cinema-btn-buy cinema-btn-sm"
                  >
                    افزودن به سفارش
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenRequest('سفارش سرویس VPN و V2Ray')}
                    className="cinema-btn cinema-btn-buy cinema-btn-sm"
                  >
                    ثبت درخواست
                  </button>
                )}
                {vpnProduct ? (
                  <a
                    href="#marketplace"
                    onClick={() => onInspectProduct(vpnProduct)}
                    className="cinema-btn cinema-btn-subtle cinema-btn-sm"
                  >
                    نمای سه‌بعدی
                  </a>
                ) : (
                  <a href="#marketplace" className="cinema-btn cinema-btn-subtle cinema-btn-sm">
                    فروشگاه سه‌بعدی
                  </a>
                )}
              </div>
            </div>
          </article>

          {/* 3. Apple ID & iCloud */}
          <article className="cinema-navy-card cinema-service-card">
            <div>
              <div className="cinema-service-head">
                <div className="cinema-service-glyph">
                  <Smartphone className="h-5 w-5" />
                </div>
                <span className="cinema-service-tag">اکوسیستم اپل</span>
              </div>
              <h3>اپل آیدی، آیکلود و خدمات اپل</h3>
              <p>
                ساخت و بازیابی اپل آیدی معتبر، ارتقای فضای iCloud+، گیفت‌کارت اپ‌استور و
                سرویس‌های اختصاصی اپل.
              </p>
            </div>
            <div className="cinema-service-foot">
              <span className="cinema-price-chip">
                {applePrice ? applePrice.label : 'استعلام قیمت'}
              </span>
              {appleProduct && applePrice?.purchasable ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    void addItem(appleProduct.id, 1, applePrice.planId, {
                      label: appleProduct.name,
                    })
                  }
                  className="cinema-btn cinema-btn-buy cinema-btn-sm"
                >
                  سفارش سرویس
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenRequest('سفارش اپل آیدی و خدمات اپل')}
                  className="cinema-btn cinema-btn-buy cinema-btn-sm"
                >
                  سفارش سرویس
                </button>
              )}
            </div>
          </article>

          {/* 4. Mobile Services & Repair */}
          <article className="cinema-navy-card cinema-service-card">
            <div>
              <div className="cinema-service-head">
                <div className="cinema-service-glyph">
                  <Wrench className="h-5 w-5" />
                </div>
                <span className="cinema-service-tag">تخصصی</span>
              </div>
              <h3>خدمات و تعمیرات موبایل</h3>
              <p>
                عیب‌یابی دقیق، تعمیرات سخت‌افزاری و نرم‌افزاری، بازیابی سیستم‌عامل و مشاوره
                پیش از تعمیر گوشی‌های هوشمند.
              </p>
            </div>
            <div className="cinema-service-foot">
              <span className="cinema-price-chip">برآورد پیش از تعمیر</span>
              <button
                type="button"
                onClick={() => onOpenRequest('ثبت درخواست تعمیر و خدمات موبایل')}
                className="cinema-btn cinema-btn-buy cinema-btn-sm"
              >
                ثبت درخواست
              </button>
            </div>
          </article>

          {/* 5. Digital Products & Services */}
          <article className="cinema-navy-card cinema-service-card">
            <div>
              <div className="cinema-service-head">
                <div className="cinema-service-glyph">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="cinema-service-tag">محصولات دیجیتال</span>
              </div>
              <h3>محصولات و خدمات دیجیتال</h3>
              <p>
                لایسنس نرم‌افزارهای معتبر، اشتراک سرویس‌های سرگرمی و ابزارهای کاربردی دیجیتال
                متناسب با نیاز شما.
              </p>
            </div>
            <div className="cinema-service-foot">
              <span className="cinema-price-chip">
                {digitalPrice ? digitalPrice.label : 'مشاهده فروشگاه'}
              </span>
              {digitalProduct && digitalPrice?.purchasable ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    void addItem(digitalProduct.id, 1, digitalPrice.planId, {
                      label: digitalProduct.name,
                    })
                  }
                  className="cinema-btn cinema-btn-buy cinema-btn-sm"
                >
                  سفارش محصول
                </button>
              ) : (
                <Link href="/shop" className="cinema-btn cinema-btn-buy cinema-btn-sm">
                  مشاهده فروشگاه
                </Link>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export function TrustSection({
  productCount,
  onOpenRequest,
}: {
  productCount: number
  onOpenRequest: (subject: string) => void
}) {
  return (
    <section className="cinema-story-scene" id="trust" data-scene="6">
      <div className="cinema-container">
        <div className="cinema-centered-intro">
          <div className="cinema-kicker">
            <span className="dot" />
            <span>اعتماد، پشتیبانی و اطمینان مشتری</span>
            <span className="code">SCENE 07</span>
          </div>
          <h2 className="cinema-section-heading">
            خرید مطمئن با{' '}
            <span className="cinema-title-accent">شفافیت و همراهی واقعی</span>
          </h2>
          <p className="cinema-lead-text">
            تمام سفارش‌ها، محاسبه قیمت‌ها، تحویل فایل‌ها و پشتیبانی فنی مستقیماً در زیرساخت
            یکپارچه <span className="cinema-brand-inline">MR.ROBOT</span> مدیریت و پیگیری
            می‌شوند.
          </p>
        </div>

        <div className="cinema-trust-grid">
          <div className="cinema-navy-card cinema-trust-card">
            <span className="cinema-price-chip">
              <Lock className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>محاسبه امن در سرور</span>
            </span>
            <h3>شفافیت قیمت و پلن‌ها</h3>
            <p>
              قیمت نهایی، کد تخفیف و پلن‌های فعال در لحظه تسویه به‌صورت مستقیم از پایگاه‌داده
              اصلی اعتبارسنجی می‌شوند.
            </p>
          </div>

          <div className="cinema-navy-card cinema-trust-card">
            <span className="cinema-price-chip">
              <FileCheck2 className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>پنل سفارش اختصاصی</span>
            </span>
            <h3>تحویل و پیگیری در حساب من</h3>
            <p>
              وضعیت هر سفارش، راهنمای فعال‌سازی و فایل‌های تحویلی در بخش سفارش‌های حساب کاربری
              شما قابل دسترسی است.
            </p>
          </div>

          <div className="cinema-navy-card cinema-trust-card">
            <span className="cinema-price-chip">
              <Headphones className="h-3.5 w-3.5 text-[#ef1d42]" />
              <span>تیکت پشتیبانی مستقیم</span>
            </span>
            <h3>پاسخ‌گویی کارشناس واقعی</h3>
            <p>
              هر درخواست مشاوره یا تعمیر به‌صورت تیکت رسمی در سیستم پشتیبانی ثبت می‌شود تا
              کارشناس فنی پیگیری کند.
            </p>
          </div>

          <div className="cinema-navy-card cinema-trust-card">
            <span className="cinema-price-chip">
              <Layers className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>
                {productCount > 0
                  ? `${toFaDigits(productCount)} محصول آماده سفارش`
                  : 'کاتالوگ به‌روز'}
              </span>
            </span>
            <h3>فرآیند شفاف تحویل</h3>
            <p>
              از انتخاب سرویس در فروشگاه سه‌بعدی تا ثبت سفارش و دریافت اطلاعات سرویس، هر مرحله
              روشن و قابل پیگیری است.
            </p>
          </div>
        </div>

        <div className="cinema-workflow-grid">
          <div className="cinema-navy-card cinema-workflow-card">
            <span className="cinema-price-chip">مرحله ۰۱</span>
            <p>
              سرویس یا پلن مورد نظر خود را در فروشگاه سه‌بعدی یا صفحه اختصاصی محصول انتخاب کرده
              و به سبد خرید اضافه کنید.
            </p>
            <div className="cinema-workflow-meta">
              <span>انتخاب پلن و قیمت واقعی</span>
              <Link href="/shop" className="text-[#38bdf8] hover:underline">
                ورود به فروشگاه
              </Link>
            </div>
          </div>

          <div className="cinema-navy-card cinema-workflow-card">
            <span className="cinema-price-chip">مرحله ۰۲</span>
            <p>
              در صفحه تسویه حساب، اطلاعات تماس خود را ثبت کرده و فرآیند پرداخت و تأیید سفارش را
              تکمیل نمایید.
            </p>
            <div className="cinema-workflow-meta">
              <span>ثبت امن در سیستم سفارش</span>
              <Link href="/account/orders" className="text-[#38bdf8] hover:underline">
                پیگیری سفارش‌ها
              </Link>
            </div>
          </div>

          <div className="cinema-navy-card cinema-workflow-card">
            <span className="cinema-price-chip">مرحله ۰۳</span>
            <p>
              اطلاعات فعال‌سازی، راهنما یا فایل‌های سرویس در پنل کاربری قرار می‌گیرد و برای هر
              سوال می‌توانید تیکت ثبت کنید.
            </p>
            <div className="cinema-workflow-meta">
              <span>پشتیبانی و تحویل مستند</span>
              <button
                type="button"
                onClick={() => onOpenRequest('سوال درباره فرآیند خرید و پشتیبانی')}
                className="cursor-pointer bg-transparent text-[#38bdf8] hover:underline"
              >
                ثبت تیکت مشاوره
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function FinaleSection({
  onOpenRequest,
}: {
  onOpenRequest: (subject: string) => void
}) {
  const { openDrawer } = useCart()

  return (
    <section
      className="cinema-story-scene cinema-finale-scene"
      id="finale"
      data-scene="7"
    >
      <div className="cinema-container">
        <div className="cinema-finale-card">
          <div className="cinema-kicker" style={{ marginBottom: '14px' }}>
            <span className="dot" />
            <span>آماده ارتقای تجربه دیجیتال خود هستید؟</span>
            <span className="code">FINALE</span>
          </div>

          <div className="cinema-finale-wordmark">
            MR.<span>ROBOT</span>
          </div>

          <p className="cinema-lead-text mx-auto text-center">
            از اشتراک‌های هوش مصنوعی و دسترسی امن تا خدمات تخصصی اپل و موبایل؛ همه چیز با نظم،
            زیبایی و اطمینان در اختیار شماست.
          </p>

          <div className="cinema-cta-group justify-center">
            <a href="#marketplace" className="cinema-btn cinema-btn-signature">
              شروع خرید از فروشگاه سه‌بعدی
            </a>
            <button
              type="button"
              onClick={openDrawer}
              className="cinema-btn cinema-btn-buy"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>مشاهده سبد سفارش</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenRequest('گفتگو با کارشناس MR.ROBOT')}
              className="cinema-btn cinema-btn-subtle"
            >
              ارتباط با پشتیبانی
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
