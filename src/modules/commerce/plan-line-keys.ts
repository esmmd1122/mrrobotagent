import type { CartLineInput, PricedCartLine } from './types'

export function cartLineKey(line: { productId: string; planId?: string | null }) {
  return `${line.productId}:${line.planId || ''}`
}

export function cartPricingMismatch(cartLines: CartLineInput[], pricedLines: PricedCartLine[]) {
  if (cartLines.length === 0) return false
  const pricedKeys = new Set(pricedLines.map(cartLineKey))
  return cartLines.some((l) => !pricedKeys.has(cartLineKey(l)))
}