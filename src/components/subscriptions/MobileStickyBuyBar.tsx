import Link from 'next/link'
import { Zap } from 'lucide-react'

type Props = {
  priceLabel: string | null
  listPriceLabel?: string | null
  buyHref: string
  ctaLabel: string
  isAnchor?: boolean
}

/**
 * Compact mobile-only bottom buy bar (height <= 72px, well within 15% mobile viewport cap)
 * so first-time mobile shoppers always see the final price and primary action without excessive scrolling.
 */
export function MobileStickyBuyBar({
  priceLabel,
  listPriceLabel,
  buyHref,
  ctaLabel,
  isAnchor = false,
}: Props) {
  return (
    <div
      role="region"
      aria-label="نوار خرید سریع موبایل"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/15 bg-[#090b12]/95 px-4 py-2.5 backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-[#9eb2d2]">قیمت نهایی</p>
          <div className="flex items-baseline gap-1.5">
            <p className="truncate text-base font-black text-white tabular-nums">
              {priceLabel || 'استعلام قیمت'}
            </p>
            {listPriceLabel ? (
              <span className="truncate text-[11px] text-white/45 line-through tabular-nums">
                {listPriceLabel}
              </span>
            ) : null}
          </div>
        </div>

        {isAnchor ? (
          <a
            href={buyHref}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#e10600] px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#e10600]/25 transition hover:bg-[#c80500] whitespace-nowrap"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{ctaLabel}</span>
          </a>
        ) : (
          <Link
            href={buyHref}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#e10600] px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#e10600]/25 transition hover:bg-[#c80500] whitespace-nowrap"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{ctaLabel}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
