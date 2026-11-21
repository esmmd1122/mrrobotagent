import { Check } from 'lucide-react'

type StepKey = 'cart' | 'checkout' | 'confirmation'

const STEPS: { key: StepKey; num: string; label: string }[] = [
  { key: 'cart', num: '۱', label: 'سبد خرید' },
  { key: 'checkout', num: '۲', label: 'اطلاعات و ثبت سفارش' },
  { key: 'confirmation', num: '۳', label: 'پرداخت و پیگیری' },
]

export function CheckoutSteps({ current }: { current: StepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current)

  return (
    <nav aria-label="مراحل خرید" className="mb-6">
      <ol className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#0d1018] p-2.5 sm:gap-3 sm:p-3">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex
          const isActive = idx === currentIndex
          return (
            <li
              key={step.key}
              aria-current={isActive ? 'step' : undefined}
              className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2 text-center text-xs font-semibold transition sm:justify-start sm:px-3.5 ${
                isActive
                  ? 'border border-[#e10600]/45 bg-[#e10600]/12 text-white'
                  : isCompleted
                    ? 'border border-emerald-500/25 bg-emerald-500/8 text-emerald-200'
                    : 'text-white/45'
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isActive
                    ? 'bg-[#e10600] text-white'
                    : isCompleted
                      ? 'bg-emerald-500/25 text-emerald-300'
                      : 'border border-white/15 bg-white/5 text-white/50'
                }`}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : step.num}
              </span>
              <span className="truncate">{step.label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
