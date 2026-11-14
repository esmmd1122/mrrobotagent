export function effectiveUnitPrice(price: number | null, promo: number | null): number | null {
  if (promo != null && promo >= 0) return promo
  if (price != null && price >= 0) return price
  return null
}

type PlanLike = { price: number; promoPrice: number | null; isActive: boolean }

export function isPurchasableProduct(input: {
  price: number | null
  promoPrice: number | null
  isAvailable: boolean
  isVisible: boolean
}): boolean {
  if (!input.isVisible || !input.isAvailable) return false
  return effectiveUnitPrice(input.price, input.promoPrice) != null
}

export function isProductPurchasable(input: {
  price: number | null
  promoPrice: number | null
  isAvailable: boolean
  isVisible: boolean
  plansEnabled: boolean
  activePlans?: PlanLike[]
}): boolean {
  if (!input.isVisible || !input.isAvailable) return false
  if (input.plansEnabled) {
    return (input.activePlans ?? []).some(
      (p) => p.isActive && effectiveUnitPrice(p.price, p.promoPrice) != null,
    )
  }
  return effectiveUnitPrice(input.price, input.promoPrice) != null
}