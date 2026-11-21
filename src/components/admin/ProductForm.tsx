'use client'

import { useActionState, useState } from 'react'
import type { Product, ProductCategory } from '@prisma/client'
import { AlertCircle, Loader2, Save } from 'lucide-react'
import {
  ImageUploaderField,
  type MediaLibraryOption,
} from '@/components/admin/ImageUploaderField'
import { calculateDiscountPercent } from '@/lib/site-config/cms-helpers'
import type { ProductActionState } from '@/app/admin/(protected)/products/actions'

type Props = {
  categories: ProductCategory[]
  product?: Product
  mediaLibrary?: MediaLibraryOption[]
  action: (
    prevState: ProductActionState,
    formData: FormData,
  ) => Promise<ProductActionState>
}

export function ProductForm({ categories, product, mediaLibrary = [], action }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)

  const [categoryId, setCategoryId] = useState<string>(
    product?.categoryId || categories[0]?.id || '',
  )
  const [slug, setSlug] = useState<string>(product?.slug || '')
  const [nameFa, setNameFa] = useState<string>(product?.nameFa || '')
  const [nameEn, setNameEn] = useState<string>(product?.nameEn || '')
  const [description, setDescription] = useState<string>(product?.description || '')
  const [priceInput, setPriceInput] = useState<string>(
    product?.price != null ? String(product.price) : '',
  )
  const [promoInput, setPromoInput] = useState<string>(
    product?.promoPrice != null ? String(product.promoPrice) : '',
  )
  const [sortOrder, setSortOrder] = useState<string>(String(product?.sortOrder ?? 0))
  const [isAvailable, setIsAvailable] = useState<boolean>(product?.isAvailable ?? true)
  const [isVisible, setIsVisible] = useState<boolean>(product?.isVisible ?? true)
  const [isFeatured, setIsFeatured] = useState<boolean>(product?.isFeatured ?? false)
  const [detailsJson, setDetailsJson] = useState<string>(product?.detailsJson || '[]')
  const [featuresJson, setFeaturesJson] = useState<string>(product?.featuresJson || '[]')
  const [purchaseFieldsJson, setPurchaseFieldsJson] = useState<string>(
    product?.purchaseFieldsJson || '[]',
  )
  const [imageUrl, setImageUrl] = useState<string>(product?.imageUrl || '')
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false)

  const numericPrice = priceInput !== '' ? Number(priceInput) : null
  const numericPromo = promoInput !== '' ? Number(promoInput) : null
  const discountPct = calculateDiscountPercent(numericPrice, numericPromo)

  return (
    <form action={formAction} className="max-w-4xl space-y-5">
      {state && !state.ok ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-500/45 bg-red-500/12 p-4 text-sm text-red-100"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div>
            <p className="font-semibold">ذخیره محصول انجام نشد</p>
            <p className="mt-0.5 text-xs leading-relaxed text-red-200">{state.error}</p>
          </div>
        </div>
      ) : null}

      {/* Section 1: Basic Info */}
      <section className="admin-card space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-bold text-white">اطلاعات پایه محصول</h2>
          <p className="mt-1 text-xs text-[#9297A3]">
            نام، دسته‌بندی، نشانی اختصاصی (Slug) و توضیح اصلی که مشتریان در فروشگاه می‌بینند.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-white/85">دسته‌بندی محصول *</span>
            <select
              name="categoryId"
              className="admin-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameFa}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-white/85">نشانی یکتا (Slug) *</span>
            <input
              name="slug"
              dir="ltr"
              className="admin-input font-mono text-xs"
              placeholder="e.g. chatgpt-plus"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            {state?.fieldErrors?.slug ? (
              <span className="block text-xs text-red-300">{state.fieldErrors.slug}</span>
            ) : null}
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-white/85">نام فارسی محصول *</span>
            <input
              name="nameFa"
              className="admin-input"
              placeholder="مثلاً: اشتراک ChatGPT Plus"
              value={nameFa}
              onChange={(e) => setNameFa(e.target.value)}
              required
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-white/85">نام انگلیسی (اختیاری)</span>
            <input
              name="nameEn"
              dir="ltr"
              className="admin-input"
              placeholder="ChatGPT Plus"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-white/85">توضیح محصول *</span>
          <textarea
            name="description"
            className="admin-input min-h-24"
            placeholder="توضیح شفاف درباره سرویس، کاربردها و نحوه تحویل..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
      </section>

      {/* Section 2: Product Image Upload */}
      <section className="admin-card p-5 sm:p-6">
        <ImageUploaderField
          name="imageUrl"
          label="تصویر محصول"
          description="تصویر اصلی محصول برای نمایش در کارت‌های فروشگاه و صفحه جزئیات (نسبت پیشنهادی ۱۶:۱۰)."
          value={imageUrl}
          onChange={setImageUrl}
          onUploadingChange={setIsUploadingImage}
          validationError={state?.fieldErrors?.imageUrl || null}
          folder="products"
          altText={nameFa || product?.nameFa || 'تصویر محصول MR.ROBOT'}
          mediaLibrary={mediaLibrary}
        />
      </section>

      {/* Section 3: Pricing & Availability */}
      <section className="admin-card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">قیمت‌گذاری و وضعیت انتشار</h2>
            <p className="mt-1 text-xs text-[#9297A3]">
              قیمت‌ها به تومان ثبت می‌شوند. اگر هر دو خالی باشند، محصول در حالت «تماس بگیرید» نمایش داده می‌شود (مگر آنکه طرح‌های چندگانه فعال باشند).
            </p>
          </div>
          {discountPct ? (
            <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-200">
              {discountPct.toLocaleString('fa-IR')}٪ تخفیف فعال
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-white/85">قیمت اصلی (تومان)</span>
            <input
              name="price"
              type="number"
              min={0}
              step="1"
              dir="ltr"
              className="admin-input tabular-nums"
              placeholder="مثلاً 950000"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-white/85">قیمت فروش ویژه / تخفیف (تومان)</span>
            <input
              name="promoPrice"
              type="number"
              min={0}
              step="1"
              dir="ltr"
              className="admin-input tabular-nums"
              placeholder="اختیاری — کمتر از قیمت اصلی"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-white/85">ترتیب نمایش</span>
            <input
              name="sortOrder"
              type="number"
              dir="ltr"
              className="admin-input tabular-nums"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 pt-1 sm:grid-cols-3">
          <label className="flex cursor-pointer items-center gap-2.5 rounded border border-white/10 bg-[#0d1017] px-3.5 py-3 text-sm">
            <input
              name="isAvailable"
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-4 w-4 accent-[#e10600]"
            />
            <div>
              <span className="block font-medium text-white">موجود برای خرید</span>
              <span className="text-[11px] text-[#9297A3]">امکان افزودن به سبد و ثبت سفارش</span>
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-2.5 rounded border border-white/10 bg-[#0d1017] px-3.5 py-3 text-sm">
            <input
              name="isVisible"
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="h-4 w-4 accent-[#e10600]"
            />
            <div>
              <span className="block font-medium text-white">فعال / نمایش در سایت</span>
              <span className="text-[11px] text-[#9297A3]">در فروشگاه عمومی نمایش داده شود</span>
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-2.5 rounded border border-white/10 bg-[#0d1017] px-3.5 py-3 text-sm">
            <input
              name="isFeatured"
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 accent-[#e10600]"
            />
            <div>
              <span className="block font-medium text-white">محصول ویژه (پیشنهادی)</span>
              <span className="text-[11px] text-[#9297A3]">نمایش نشان ویژه روی کارت محصول</span>
            </div>
          </label>
        </div>
      </section>

      {/* Section 4: Details, Features & Purchase Fields */}
      <section className="admin-card space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-bold text-white">جزئیات، مزایا و فیلدهای خرید</h2>
          <p className="mt-1 text-xs text-[#9297A3]">
            آرایه‌های JSON معتبر وارد کنید. این موارد مستقیماً در صفحه جزئیات و فرم خرید نمایش داده می‌شوند.
          </p>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-white/85">جزئیات محصول (JSON Array)</span>
          <textarea
            name="detailsJson"
            dir="ltr"
            className="admin-input min-h-20 font-mono text-xs"
            value={detailsJson}
            onChange={(e) => setDetailsJson(e.target.value)}
            placeholder='["جزئیات ۱", "جزئیات ۲"]'
          />
          {state?.fieldErrors?.detailsJson ? (
            <span className="block text-xs text-red-300">{state.fieldErrors.detailsJson}</span>
          ) : null}
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-white/85">ویژگی‌ها و مزایا (JSON Array)</span>
          <textarea
            name="featuresJson"
            dir="ltr"
            className="admin-input min-h-20 font-mono text-xs"
            value={featuresJson}
            onChange={(e) => setFeaturesJson(e.target.value)}
            placeholder='["پشتیبانی فعال‌سازی", "تحویل سریع"]'
          />
          {state?.fieldErrors?.featuresJson ? (
            <span className="block text-xs text-red-300">{state.fieldErrors.featuresJson}</span>
          ) : null}
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-white/85">فیلدهای اختصاصی صفحه خرید (JSON)</span>
          <textarea
            name="purchaseFieldsJson"
            dir="ltr"
            className="admin-input min-h-24 font-mono text-xs"
            value={purchaseFieldsJson}
            onChange={(e) => setPurchaseFieldsJson(e.target.value)}
            placeholder='[{"id":"telegram_id","label":"آیدی تلگرام","type":"text","required":true}]'
          />
          {state?.fieldErrors?.purchaseFieldsJson ? (
            <span className="block text-xs text-red-300">
              {state.fieldErrors.purchaseFieldsJson}
            </span>
          ) : null}
          <span className="block text-[11px] text-[#9297A3]">
            انواع مجاز type: text | textarea | email
          </span>
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending || isUploadingImage}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#e10600] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(225,6,0,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending || isUploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>
            {isUploadingImage
              ? 'در حال آپلود تصویر... لطفاً صبر کنید'
              : isPending
                ? 'در حال ذخیره محصول...'
                : product
                  ? 'ذخیره تغییرات محصول'
                  : 'ایجاد محصول جدید'}
          </span>
        </button>
      </div>
    </form>
  )
}
