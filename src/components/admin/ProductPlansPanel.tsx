'use client'

import { useTransition } from 'react'
import {
  createProductPlan,
  deleteProductPlan,
  setProductPlansEnabled,
  updateProductPlan,
} from '@/app/admin/(protected)/products/plan-actions'
import { PLAN_DURATION_UNITS } from '@/modules/commerce/plan-labels'
import type { Product, ProductPlan } from '@prisma/client'

type Props = {
  product: Product
  plans: ProductPlan[]
}

const emptyPlan = {
  title: '',
  description: '',
  price: '',
  promoPrice: '',
  durationValue: '1',
  durationUnit: 'MONTH',
  fulfillmentInstructions: '',
  sortOrder: '0',
}

export function ProductPlansPanel({ product, plans }: Props) {
  const [pending, start] = useTransition()

  return (
    <section className="admin-card space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-sm text-[#9297A3]">طرح‌های خرید (چند پلنی)</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={product.plansEnabled}
            disabled={pending}
            onChange={(e) =>
              start(() => setProductPlansEnabled(product.id, e.target.checked).catch(alert))
            }
          />
          فعال‌سازی چند طرح برای این محصول
        </label>
      </div>

      {plans.map((plan) => (
        <form
          key={plan.id}
          action={(fd) => start(() => updateProductPlan(plan.id, fd).catch((e) => alert(String(e))))}
          className="space-y-2 rounded border border-[#2a2b35] p-3"
        >
          <p className="text-xs text-white/50">شناسه: {plan.id}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="title" defaultValue={plan.title} className="admin-input" placeholder="عنوان طرح" required />
            <input name="sortOrder" type="number" defaultValue={plan.sortOrder} className="admin-input" />
          </div>
          <textarea name="description" defaultValue={plan.description || ''} className="admin-input min-h-16 text-sm" />
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="price" type="number" min={0} step={1} defaultValue={plan.price} className="admin-input" placeholder="قیمت (تومان)" />
            <input
              name="promoPrice"
              type="number"
              min={0}
              step={1}
              defaultValue={plan.promoPrice ?? ''}
              className="admin-input"
              placeholder="قیمت ویژه"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="durationValue" type="number" min={1} defaultValue={plan.durationValue ?? ''} className="admin-input" />
            <select name="durationUnit" defaultValue={plan.durationUnit} className="admin-input">
              {PLAN_DURATION_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <textarea
            name="fulfillmentInstructions"
            defaultValue={plan.fulfillmentInstructions || ''}
            className="admin-input min-h-16 text-sm"
            placeholder="دستورالعمل تحویل (فقط ادمین)"
          />
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input name="isActive" type="checkbox" defaultChecked={plan.isActive} /> فعال
            </label>
            <label className="flex items-center gap-2">
              <input name="isFeatured" type="checkbox" defaultChecked={plan.isFeatured} /> پیشنهادی
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="rounded-lg bg-[#e10600] px-3 py-2 text-sm">
              ذخیره طرح
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300"
              onClick={() =>
                start(() => {
                  if (confirm('حذف طرح؟')) deleteProductPlan(plan.id).catch((e) => alert(String(e)))
                })
              }
            >
              حذف
            </button>
          </div>
        </form>
      ))}

      <form
        action={(fd) => start(() => createProductPlan(product.id, fd).catch((e) => alert(String(e))))}
        className="space-y-2 rounded border border-dashed border-[#2a2b35] p-3"
      >
        <p className="text-sm font-medium">افزودن طرح جدید</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="title" defaultValue={emptyPlan.title} className="admin-input" placeholder="مثلاً ماهانه" required />
          <input name="sortOrder" type="number" defaultValue={plans.length} className="admin-input" />
        </div>
        <textarea name="description" className="admin-input min-h-16 text-sm" placeholder="توضیح کوتاه" />
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="price" type="number" min={0} step={1} className="admin-input" placeholder="قیمت تومان" required />
          <input name="promoPrice" type="number" min={0} step={1} className="admin-input" placeholder="قیمت ویژه" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="durationValue" type="number" min={1} defaultValue="1" className="admin-input" />
          <select name="durationUnit" defaultValue="MONTH" className="admin-input">
            {PLAN_DURATION_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <textarea name="fulfillmentInstructions" className="admin-input min-h-16 text-sm" />
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input name="isActive" type="checkbox" defaultChecked /> فعال
          </label>
          <label className="flex items-center gap-2">
            <input name="isFeatured" type="checkbox" /> پیشنهادی
          </label>
        </div>
        <button type="submit" disabled={pending} className="rounded-lg bg-[#e10600] px-3 py-2 text-sm">
          افزودن طرح
        </button>
      </form>
    </section>
  )
}