import { effectiveUnitPrice, isProductPurchasable } from './unit-price.ts'

export type DisplayPricePlan = {
  id: string
  price: number
  promoPrice: number | null
  isActive: boolean
  isFeatured?: boolean
}

export type DisplayPriceProduct = {
  price: number | null
  promoPrice: number | null
  isAvailable: boolean
  isVisible?: boolean
  plansEnabled: boolean
  plans: DisplayPricePlan[]
}

export type ResolvedProductDisplayPrice = {
  purchasable: boolean
  unitPrice: number | null
  listPrice: number | null
  isFromPrice: boolean
  defaultPlanId: string | null
  activePlanCount: number
}

/**
 * Resolves storefront card display price for both legacy single-price products
 * and multi-plan (`plansEnabled`) products using active DB plans.
 */
export function resolveProductDisplayPrice(
  product: DisplayPriceProduct,
): ResolvedProductDisplayPrice {
  const purchasable = isProductPurchasable({
    price: product.price,
    promoPrice: product.promoPrice,
    isAvailable: product.isAvailable,
    isVisible: product.isVisible ?? true,
    plansEnabled: product.plansEnabled,
    activePlans: product.plans,
  })

  if (!purchasable) {
    return {
      purchasable: false,
      unitPrice: null,
      listPrice: null,
      isFromPrice: false,
      defaultPlanId: null,
      activePlanCount: 0,
    }
  }

  if (product.plansEnabled) {
    const pricedPlans = product.plans
      .filter((p) => p.isActive)
      .map((p) => ({
        plan: p,
        unit: effectiveUnitPrice(p.price, p.promoPrice ?? null),
      }))
      .filter((x): x is { plan: DisplayPricePlan; unit: number } => x.unit != null)

    if (pricedPlans.length === 0) {
      return {
        purchasable: false,
        unitPrice: null,
        listPrice: null,
        isFromPrice: false,
        defaultPlanId: null,
        activePlanCount: 0,
      }
    }

    let minEntry = pricedPlans[0]
    let maxUnit = pricedPlans[0].unit
    for (const entry of pricedPlans) {
      if (entry.unit < minEntry.unit) minEntry = entry
      if (entry.unit > maxUnit) maxUnit = entry.unit
    }

    const featured = pricedPlans.find((x) => x.plan.isFeatured)
    const defaultPlan = featured ?? minEntry
    const isFromPrice = pricedPlans.length > 1 && maxUnit > minEntry.unit

    return {
      purchasable: true,
      unitPrice: minEntry.unit,
      listPrice: minEntry.plan.price > minEntry.unit ? minEntry.plan.price : null,
      isFromPrice,
      defaultPlanId: defaultPlan.plan.id,
      activePlanCount: pricedPlans.length,
    }
  }

  const unit = effectiveUnitPrice(product.price, product.promoPrice)
  const list = product.price != null && unit != null && product.price > unit ? product.price : null
  return {
    purchasable: unit != null,
    unitPrice: unit,
    listPrice: list,
    isFromPrice: false,
    defaultPlanId: null,
    activePlanCount: 0,
  }
}
