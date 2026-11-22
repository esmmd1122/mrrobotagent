export type CarouselDirection = 'prev' | 'next'

export type CarouselNavBounds = {
  canPrev: boolean
  canNext: boolean
}

/**
 * Computes the horizontal pixel delta to advance one carousel card cleanly.
 */
export function computeCarouselStep(
  containerWidth: number,
  cardWidth: number | null,
  gapPx = 16,
): number {
  if (cardWidth && Number.isFinite(cardWidth) && cardWidth > 40) {
    return Math.round(cardWidth + Math.max(0, gapPx))
  }
  const safeContainer = Number.isFinite(containerWidth) && containerWidth > 0 ? containerWidth : 320
  return Math.max(220, Math.round(safeContainer * 0.82))
}

/**
 * Resolves the signed scrollBy `left` delta for RTL and LTR horizontal scrollers.
 * In RTL containers (standard Chrome/Safari/Firefox), moving to the "next" item
 * scrolls toward negative X (`-step`), while "prev" scrolls toward positive X (`+step`).
 */
export function resolveCarouselScrollDelta(
  direction: CarouselDirection,
  stepPx: number,
  isRtl: boolean,
): number {
  const step = Math.max(1, Math.abs(stepPx))
  if (isRtl) {
    return direction === 'next' ? -step : step
  }
  return direction === 'next' ? step : -step
}

/**
 * Normalizes scrollLeft across RTL/LTR browsers into a non-negative offset [0..maxScroll].
 */
export function normalizeScrollOffset(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
): { offset: number; maxScroll: number } {
  const maxScroll = Math.max(0, scrollWidth - clientWidth)
  if (maxScroll === 0 || !Number.isFinite(scrollLeft)) {
    return { offset: 0, maxScroll }
  }
  const offset = Math.min(maxScroll, Math.abs(scrollLeft))
  return { offset, maxScroll }
}

/**
 * Determines whether previous/next navigation arrows should be enabled.
 */
export function computeCarouselNavBounds(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
  tolerancePx = 8,
): CarouselNavBounds {
  const { offset, maxScroll } = normalizeScrollOffset(scrollLeft, scrollWidth, clientWidth)
  if (maxScroll <= tolerancePx) {
    return { canPrev: false, canNext: false }
  }
  return {
    canPrev: offset > tolerancePx,
    canNext: offset < maxScroll - tolerancePx,
  }
}

/**
 * Computes the active visible card index [0..totalItems - 1] from scroll progress.
 */
export function computeActiveCarouselIndex(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
  stepPx: number,
  totalItems: number,
): number {
  if (totalItems <= 1) return 0
  const { offset, maxScroll } = normalizeScrollOffset(scrollLeft, scrollWidth, clientWidth)
  if (maxScroll <= 0 || stepPx <= 0) return 0
  if (offset >= maxScroll - 6) return totalItems - 1
  const raw = Math.round(offset / stepPx)
  return Math.max(0, Math.min(totalItems - 1, raw))
}
