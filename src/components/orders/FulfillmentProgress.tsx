import { FULFILLMENT_STATUSES } from '@/modules/commerce/constants'
import { FULFILLMENT_STATUS_LABELS } from '@/modules/fulfillment/labels'

export function FulfillmentProgress({ current }: { current: string }) {
  const currentIdx = FULFILLMENT_STATUSES.indexOf(current as (typeof FULFILLMENT_STATUSES)[number])

  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {FULFILLMENT_STATUSES.map((s, i) => {
        const active = current !== 'FAILED' && currentIdx >= 0 && i <= currentIdx
        const failed = current === 'FAILED' && s === 'FAILED'
        return (
          <li
            key={s}
            className={`rounded-lg border px-3 py-2 text-xs ${
              failed
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : active
                  ? 'border-mr-red/40 bg-mr-red/10 text-white'
                  : 'border-mr-border text-mr-muted'
            }`}
          >
            {FULFILLMENT_STATUS_LABELS[s]}
          </li>
        )
      })}
    </ol>
  )
}