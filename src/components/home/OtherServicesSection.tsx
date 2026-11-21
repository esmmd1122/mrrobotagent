'use client'

import { useCart } from '@/components/cart/CartProvider'
import type { StorefrontProduct } from '@/lib/mappers/product'
import { findMatchingProduct, formatProductPriceLabel } from './product-helpers'

type Props = {
  products: StorefrontProduct[]
  title?: string
  description?: string
  onOpenRequest: (subject: string) => void
}

export function OtherServicesSection({ products, onOpenRequest }: Props) {
  const { addItem, isLoading } = useCart()

  const appleIdProduct = findMatchingProduct(products, /apple-id|appleid|apple/)
  const icloudProduct = findMatchingProduct(products, /icloud|cloud|apple/)

  const appleIdPrice = appleIdProduct ? formatProductPriceLabel(appleIdProduct) : null
  const icloudPrice = icloudProduct ? formatProductPriceLabel(icloudProduct) : null

  return (
    <section
      className="cinema-story-scene"
      id="apple-mobile"
      data-scene="5"
    >
      <div className="cinema-container">
        <div className="cinema-apple-split">
          {/* Right space frames MR.ROBOT examining floating hologram on desktop */}
          <div className="cinema-stage-spacer" aria-hidden="true" />

          <div>
            <div className="cinema-kicker">
              <span className="dot" />
              <span>خدمات تخصصی اپل و موبایل</span>
              <span className="code">SCENE 06</span>
            </div>

            <h2 className="cinema-section-heading">
              رسیدگی دقیق به{' '}
              <span className="cinema-title-accent">اکوسیستم اپل و تلفن همراه شما</span>
            </h2>

            <p className="cinema-lead-text">
              از ساخت و مدیریت ایمن اپل آیدی و ارتقای فضای آیکلود تا عیب‌یابی تخصصی و خدمات
              نرم‌افزاری و سخت‌افزاری موبایل با استاندارد حرفه‌ای.
            </p>

            <div className="cinema-apple-grid">
              <div className="cinema-navy-card cinema-apple-card">
                <div>
                  <span className="cinema-price-chip">اکوسیستم اپل</span>
                  <h3>ساخت و تحویل اپل آیدی اختصاصی</h3>
                  <p>
                    ایجاد اپل آیدی اختصاصی با تنظیمات امنیتی استاندارد و انتقال کامل مالکیت به
                    کاربر.
                  </p>
                </div>
                <div className="cinema-service-foot">
                  <span className="cinema-price-chip">
                    {appleIdPrice ? appleIdPrice.label : 'استعلام تعرفه'}
                  </span>
                  {appleIdProduct && appleIdPrice?.purchasable ? (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() =>
                        void addItem(appleIdProduct.id, 1, appleIdPrice.planId, {
                          label: appleIdProduct.name,
                          openAfterAdd: true,
                        })
                      }
                      className="cinema-btn cinema-btn-buy cinema-btn-sm"
                    >
                      ثبت سفارش
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenRequest('درخواست ساخت اپل آیدی اختصاصی')}
                      className="cinema-btn cinema-btn-buy cinema-btn-sm"
                    >
                      ثبت سفارش
                    </button>
                  )}
                </div>
              </div>

              <div className="cinema-navy-card cinema-apple-card">
                <div>
                  <span className="cinema-price-chip">فضای ابری اپل</span>
                  <h3>ارتقای فضای iCloud+ و سرویس‌های اپل</h3>
                  <p>
                    افزایش فضای ذخیره‌سازی ابری برای بکاپ امن تصاویر، فایل‌ها و هماهنگی میان
                    دستگاه‌های اپل.
                  </p>
                </div>
                <div className="cinema-service-foot">
                  <span className="cinema-price-chip">
                    {icloudPrice ? icloudPrice.label : 'استعلام تعرفه'}
                  </span>
                  {icloudProduct && icloudPrice?.purchasable ? (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() =>
                        void addItem(icloudProduct.id, 1, icloudPrice.planId, {
                          label: icloudProduct.name,
                          openAfterAdd: true,
                        })
                      }
                      className="cinema-btn cinema-btn-buy cinema-btn-sm"
                    >
                      ثبت سفارش
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenRequest('درخواست ارتقای فضای iCloud+')}
                      className="cinema-btn cinema-btn-buy cinema-btn-sm"
                    >
                      ثبت سفارش
                    </button>
                  )}
                </div>
              </div>

              <div className="cinema-navy-card cinema-apple-card">
                <div>
                  <span className="cinema-price-chip">بررسی تخصصی</span>
                  <h3>تعمیرات سخت‌افزاری موبایل</h3>
                  <p>
                    تعویض نمایشگر، باتری و قطعات کلیدی با عیب‌یابی اولیه شفاف و اعلام هزینه
                    پیش از انجام کار.
                  </p>
                </div>
                <div className="cinema-service-foot">
                  <span className="cinema-price-chip">استعلام هزینه</span>
                  <button
                    type="button"
                    onClick={() => onOpenRequest('درخواست تعمیر سخت‌افزاری موبایل')}
                    className="cinema-btn cinema-btn-buy cinema-btn-sm"
                  >
                    درخواست تعمیر
                  </button>
                </div>
              </div>

              <div className="cinema-navy-card cinema-apple-card">
                <div>
                  <span className="cinema-price-chip">حضوری / غیرحضوری</span>
                  <h3>خدمات نرم‌افزاری و بازیابی سیستم</h3>
                  <p>
                    رفع خطاهای سیستم‌عامل، انتقال امن اطلاعات و بهینه‌سازی تنظیمات گوشی بدون
                    آسیب به داده‌ها.
                  </p>
                </div>
                <div className="cinema-service-foot">
                  <span className="cinema-price-chip">استعلام هزینه</span>
                  <button
                    type="button"
                    onClick={() => onOpenRequest('درخواست خدمات نرم‌افزاری موبایل')}
                    className="cinema-btn cinema-btn-buy cinema-btn-sm"
                  >
                    ثبت درخواست
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
