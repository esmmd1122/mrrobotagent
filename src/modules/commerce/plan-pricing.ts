import { prisma } from '@/lib/db'
import { effectiveUnitPrice } from './unit-price'
import type { CartLineInput, PricedCartLine } from './types'
export { cartLineKey, cartPricingMismatch } from './plan-line-keys'

export async function priceCartLines(lines: CartLineInput[]): Promise<PricedCartLine[]> {
  if (lines.length === 0) return []

  const productIds = Array.from(new Set(lines.map((l) => l.productId)))
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isVisible: true, isAvailable: true },
    select: {
      id: true,
      slug: true,
      nameFa: true,
      price: true,
      promoPrice: true,
      isAvailable: true,
      plansEnabled: true,
    },
  })
  const byProduct = new Map(products.map((p) => [p.id, p]))

  const planIds = Array.from(new Set(lines.map((l) => l.planId).filter(Boolean))) as string[]
  const plans =
    planIds.length === 0
      ? []
      : await prisma.productPlan.findMany({
          where: { id: { in: planIds }, isActive: true },
        })
  const byPlan = new Map(plans.map((p) => [p.id, p]))

  const priced: PricedCartLine[] = []
  for (const line of lines) {
    const product = byProduct.get(line.productId)
    if (!product) continue

    if (product.plansEnabled) {
      if (!line.planId) continue
      const plan = byPlan.get(line.planId)
      if (!plan || plan.productId !== product.id) continue
      const unit = effectiveUnitPrice(plan.price, plan.promoPrice)
      if (unit == null) continue
      const list = plan.price ?? unit
      priced.push({
        productId: product.id,
        planId: plan.id,
        slug: product.slug,
        productName: product.nameFa,
        planTitle: plan.title,
        planDurationValue: plan.durationValue,
        planDurationUnit: plan.durationUnit,
        planFulfillmentInstructions: plan.fulfillmentInstructions,
        name: `${product.nameFa} — ${plan.title}`,
        quantity: line.quantity,
        listUnitPrice: list,
        unitPrice: unit,
        lineTotal: unit * line.quantity,
        available: product.isAvailable,
      })
      continue
    }

    const unit = effectiveUnitPrice(product.price, product.promoPrice)
    if (unit == null) continue
    const list = product.price ?? unit
    if (line.planId) continue
    priced.push({
      productId: product.id,
      planId: null,
      slug: product.slug,
      productName: product.nameFa,
      name: product.nameFa,
      quantity: line.quantity,
      listUnitPrice: list,
      unitPrice: unit,
      lineTotal: unit * line.quantity,
      available: product.isAvailable,
    })
  }
  return priced
}