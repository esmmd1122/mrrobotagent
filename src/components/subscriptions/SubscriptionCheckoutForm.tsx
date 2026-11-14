'use client'

import { useTransition } from 'react'
import type { PurchaseFieldDef } from '@/modules/commerce/purchase-fields'

type Props = {
  slug: string
  planId?: string
  idempotencyKey: string
  purchaseFields: PurchaseFieldDef[]
  defaultName?: string
  defaultEmail?: string
  defaultPhone?: string
  submitAction: (slug: string, formData: FormData) => Promise<void>
}

export function SubscriptionCheckoutForm({
  slug,
  planId,
  idempotencyKey,
  purchaseFields,
  defaultName,
  defaultEmail,
  defaultPhone,
  submitAction,
}: Props) {
  const [pending, start] = useTransition()

  return (
    <form
      className="card-shop space-y-4 p-6"
      action={(fd) => start(() => submitAction(slug, fd))}
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {planId ? <input type="hidden" name="planId" value={planId} /> : null}
      <label className="block text-sm">
        نام و نام خانوادگی *
        <input
          name="name"
          required
          defaultValue={defaultName}
          className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        ایمیل
        <input
          name="email"
          type="email"
          defaultValue={defaultEmail}
          className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
          dir="ltr"
        />
      </label>
      <label className="block text-sm">
        موبایل
        <input
          name="phone"
          defaultValue={defaultPhone}
          className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
          dir="ltr"
          placeholder="09xxxxxxxxx"
        />
      </label>

      {purchaseFields.map((f) => (
        <label key={f.id} className="block text-sm">
          {f.label}
          {f.required ? ' *' : ''}
          {f.type === 'textarea' ? (
            <textarea
              name={`pf_${f.id}`}
              required={f.required}
              maxLength={f.maxLength}
              className="mt-1 min-h-20 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
            />
          ) : (
            <input
              name={`pf_${f.id}`}
              type={f.type === 'email' ? 'email' : 'text'}
              required={f.required}
              maxLength={f.maxLength}
              className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
              dir={f.type === 'email' ? 'ltr' : undefined}
            />
          )}
        </label>
      ))}

      <label className="block text-sm">
        کد تخفیف
        <input
          name="discountCode"
          className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
          dir="ltr"
          autoComplete="off"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input name="termsAccepted" type="checkbox" value="on" required className="mt-1" />
        <span>قوانین و شرایط استفاده از خدمات دیجیتال MR.ROBOT را می‌پذیرم.</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-mr-red py-3 font-semibold disabled:opacity-60"
      >
        {pending ? 'در حال ثبت و اتصال به درگاه...' : 'تأیید و پرداخت'}
      </button>
    </form>
  )
}