import type { Product, ProductCategory } from '@prisma/client'

type Props = {
  categories: ProductCategory[]
  product?: Product
  action: (formData: FormData) => Promise<void>
}

export function ProductForm({ categories, product, action }: Props) {
  const detailsDefault = product?.detailsJson || '[]'
  const featuresDefault = product?.featuresJson || '[]'
  const purchaseFieldsDefault = product?.purchaseFieldsJson || '[]'

  return (
    <form action={action} className="admin-card max-w-3xl space-y-4 p-6">
      <select name="categoryId" className="admin-input" defaultValue={product?.categoryId} required>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nameFa}
          </option>
        ))}
      </select>
      <input name="slug" className="admin-input" placeholder="slug" defaultValue={product?.slug} required />
      <input name="nameFa" className="admin-input" placeholder="نام فارسی" defaultValue={product?.nameFa} required />
      <input name="nameEn" className="admin-input" placeholder="نام انگلیسی" defaultValue={product?.nameEn || ''} />
      <textarea name="description" className="admin-input min-h-24" defaultValue={product?.description} required />
      <textarea
        name="detailsJson"
        className="admin-input min-h-20 font-mono text-xs"
        defaultValue={detailsDefault}
        placeholder='["جزئیات ۱"]'
      />
      <textarea
        name="featuresJson"
        className="admin-input min-h-20 font-mono text-xs"
        defaultValue={featuresDefault}
        placeholder='["مزیت ۱"]'
      />
      <textarea
        name="purchaseFieldsJson"
        className="admin-input min-h-24 font-mono text-xs"
        defaultValue={purchaseFieldsDefault}
        placeholder='[{"id":"telegram_id","label":"آیدی تلگرام","type":"text","required":true}]'
      />
      <p className="text-xs text-white/50">
        فیلدهای اختصاصی صفحه خرید اشتراک (JSON). type: text | textarea | email
      </p>
      <p className="text-xs text-white/50">قیمت‌ها به تومان (بدون تبدیل ریال). خالی = تماس بگیرید / بدون خرید آنلاین.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="price"
          type="number"
          min={0}
          step="1"
          className="admin-input"
          placeholder="قیمت (تومان)"
          defaultValue={product?.price ?? ''}
        />
        <input
          name="promoPrice"
          type="number"
          min={0}
          step="1"
          className="admin-input"
          placeholder="قیمت فروش ویژه (تومان)"
          defaultValue={product?.promoPrice ?? ''}
        />
      </div>
      <input name="imageUrl" className="admin-input" placeholder="آدرس تصویر" defaultValue={product?.imageUrl || ''} />
      <input name="sortOrder" type="number" className="admin-input" defaultValue={product?.sortOrder ?? 0} />
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input name="isAvailable" type="checkbox" defaultChecked={product?.isAvailable ?? true} />
          موجود
        </label>
        <label className="flex items-center gap-2">
          <input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured ?? false} />
          ویژه
        </label>
        <label className="flex items-center gap-2">
          <input name="isVisible" type="checkbox" defaultChecked={product?.isVisible ?? true} />
          نمایش در سایت
        </label>
      </div>
      <button type="submit" className="rounded-xl bg-[#e10600] px-6 py-3 text-sm font-semibold">
        ذخیره محصول
      </button>
    </form>
  )
}
