'use client'

import { useTransition } from 'react'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'
import { FULFILLMENT_STATUSES } from '@/modules/commerce/constants'
import {
  assignOrderFulfillment,
  saveFulfillmentNotes,
  setFulfillmentStatus,
  uploadFulfillmentDeliveryFile,
} from '@/app/admin/(protected)/orders/fulfillment-actions'

type FileRow = {
  id: string
  filename: string
  url: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

type Props = {
  orderId: string
  paymentStatus: string
  fulfillmentStatus: string
  assignedAdminId: string | null
  assignedAdminName: string | null
  assignedAt: string | null
  internalNotes: string | null
  deliveryInfo: string | null
  failureReason: string | null
  files: FileRow[]
}

export function FulfillmentPanel(props: Props) {
  const [pending, start] = useTransition()
  const canProcess = props.paymentStatus === 'PAID'

  return (
    <section className="admin-card space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">مدیریت تحویل</h2>
        <span className="text-xs text-[#9297A3]">
          پرداخت: {props.paymentStatus} — تحویل: {FULFILLMENT_STATUS_LABELS[props.fulfillmentStatus] || props.fulfillmentStatus}
        </span>
      </div>

      {!canProcess ? (
        <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          تا زمانی که پرداخت تأیید نشده (PAID)، پردازش تحویل غیرفعال است.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !canProcess}
          className="rounded-lg border border-[#2a2b35] px-4 py-2 text-sm disabled:opacity-50"
          onClick={() => start(async () => { await assignOrderFulfillment(props.orderId) })}
        >
          اختصاص به من / شروع پردازش
        </button>
        {props.assignedAdminId ? (
          <span className="text-xs text-white/50">
            مسئول: {props.assignedAdminName || '—'} —{' '}
            {props.assignedAt ? new Date(props.assignedAt).toLocaleString('fa-IR') : '—'}
          </span>
        ) : null}
      </div>

      <form
        action={(fd) => start(async () => { await setFulfillmentStatus(props.orderId, fd) })}
        className="space-y-2 border-t border-[#2a2b35] pt-3"
      >
        <label className="block text-sm">
          وضعیت تحویل
          <select name="status" defaultValue={props.fulfillmentStatus} className="admin-input mt-1" disabled={!canProcess}>
            {FULFILLMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {FULFILLMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          دلیل شکست (در صورت FAILED)
          <input name="failureReason" defaultValue={props.failureReason || ''} className="admin-input mt-1" />
        </label>
        <button type="submit" disabled={pending || !canProcess} className="rounded-lg bg-[#e10600] px-4 py-2 text-sm disabled:opacity-50">
          بروزرسانی وضعیت تحویل
        </button>
      </form>

      <form
        action={(fd) => start(async () => { await saveFulfillmentNotes(props.orderId, fd) })}
        className="space-y-2 border-t border-[#2a2b35] pt-3"
      >
        <label className="block text-sm">
          یادداشت داخلی (مشتری نمی‌بیند)
          <textarea name="internalNotes" defaultValue={props.internalNotes || ''} className="admin-input mt-1 min-h-20" />
        </label>
        <label className="block text-sm">
          اطلاعات تحویل برای مشتری
          <textarea
            name="deliveryInfo"
            defaultValue={props.deliveryInfo || ''}
            className="admin-input mt-1 min-h-20"
            disabled={!canProcess}
          />
        </label>
        <button type="submit" disabled={pending} className="rounded-lg border border-[#2a2b35] px-4 py-2 text-sm">
          ذخیره یادداشت / تحویل
        </button>
      </form>

      <form
        action={(fd) => start(async () => { await uploadFulfillmentDeliveryFile(props.orderId, fd) })}
        className="space-y-2 border-t border-[#2a2b35] pt-3"
        encType="multipart/form-data"
      >
        <label className="block text-sm">
          فایل تحویل (PDF, ZIP, تصویر — حداکثر ۱۰MB)
          <input name="file" type="file" className="admin-input mt-1" disabled={!canProcess} accept=".pdf,.zip,.txt,image/*" />
        </label>
        <button type="submit" disabled={pending || !canProcess} className="rounded-lg border border-[#2a2b35] px-4 py-2 text-sm disabled:opacity-50">
          آپلود فایل
        </button>
      </form>

      {props.files.length > 0 ? (
        <ul className="space-y-1 border-t border-[#2a2b35] pt-3 text-sm">
          {props.files.map((f) => (
            <li key={f.id}>
              <a href={`/api/admin/fulfillment/files/${f.id}/download`} className="text-[#e10600] underline">
                {f.filename}
              </a>
              <span className="mr-2 text-xs text-white/45">({Math.round(f.sizeBytes / 1024)} KB)</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}