import type { StorefrontProduct, StorefrontProductPlan } from '@/lib/mappers/product'
import { formatStoreMoney } from '@/modules/commerce/money'
import { effectiveUnitPrice } from '@/modules/commerce/unit-price'

export type HomeCategoryItem = {
  id: string
  slug: string
  nameFa: string
  description: string | null
  productCount: number
}

export type HomeAIOffering = {
  id: string
  slug: string
  titleFa: string
  description: string
  useCase: string
  price: number | null
}

export function toFaDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

export function getDefaultPlan(product: StorefrontProduct): StorefrontProductPlan | null {
  if (!product.plansEnabled) return null
  const active = product.activePlans.filter((p) => p.isActive && p.price > 0)
  if (active.length === 0) return null
  return active.find((p) => p.isFeatured) ?? active[0]
}

export function getEffectiveProductUnitPrice(
  product: StorefrontProduct,
  selectedPlan?: StorefrontProductPlan | null,
): number | null {
  if (product.plansEnabled) {
    const plan = selectedPlan ?? getDefaultPlan(product)
    if (!plan) return null
    return effectiveUnitPrice(plan.price, plan.promoPrice)
  }
  return effectiveUnitPrice(product.price, product.promoPrice)
}

export function formatProductPriceLabel(
  product: StorefrontProduct,
  selectedPlan?: StorefrontProductPlan | null,
): { label: string; isPromo: boolean; purchasable: boolean; planId: string | null } {
  if (product.plansEnabled) {
    const active = product.activePlans.filter((p) => p.isActive && p.price > 0)
    if (active.length === 0) {
      return { label: 'استعلام قیمت', isPromo: false, purchasable: false, planId: null }
    }
    const plan = selectedPlan ?? getDefaultPlan(product) ?? active[0]
    const unit = effectiveUnitPrice(plan.price, plan.promoPrice)
    if (unit === null) {
      return { label: 'استعلام قیمت', isPromo: false, purchasable: false, planId: null }
    }
    const isPromo =
      plan.promoPrice !== null && plan.promoPrice > 0 && plan.promoPrice < plan.price
    return {
      label: formatStoreMoney(unit, product.currency),
      isPromo,
      purchasable: true,
      planId: plan.id,
    }
  }

  const unit = effectiveUnitPrice(product.price, product.promoPrice)
  if (unit === null) {
    return { label: 'تماس بگیرید', isPromo: false, purchasable: false, planId: null }
  }
  const isPromo =
    product.promoPrice !== null &&
    product.price !== null &&
    product.promoPrice > 0 &&
    product.promoPrice < product.price
  return {
    label: formatStoreMoney(unit, product.currency),
    isPromo,
    purchasable: true,
    planId: null,
  }
}

export function findMatchingProduct(
  products: StorefrontProduct[],
  pattern: RegExp,
): StorefrontProduct | undefined {
  return products.find((p) =>
    pattern.test(
      `${p.slug} ${p.name} ${p.nameEn} ${p.categorySlug ?? ''} ${p.categoryNameFa ?? ''}`.toLowerCase(),
    ),
  )
}
