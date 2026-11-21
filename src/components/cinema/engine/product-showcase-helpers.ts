import type { StorefrontProduct, StorefrontProductPlan } from '@/lib/mappers/product'
import { formatStoreMoney } from '@/modules/commerce/money'
import { effectiveUnitPrice } from '@/modules/commerce/unit-price'
import { getDefaultPlan } from '@/components/home/product-helpers'

export type ProductDisplayPricing = {
  finalPrice: number | null
  originalPrice: number | null
  discountPercent: number | null
  formattedFinal: string
  formattedOriginal: string | null
  isPromo: boolean
  purchasable: boolean
  planId: string | null
  planTitle: string | null
}

export type CoverUvTransform = {
  repeatX: number
  repeatY: number
  offsetX: number
  offsetY: number
}

export type ClampedShowcaseRotation = {
  yaw: number
  pitch: number
}

/**
 * Computes an integer discount percentage strictly when a valid promotional
 * price exists below the regular list price. Returns null otherwise.
 */
export function calculateValidDiscountPercent(
  price: number | null | undefined,
  promoPrice: number | null | undefined,
): number | null {
  if (
    typeof price !== 'number' ||
    typeof promoPrice !== 'number' ||
    !Number.isFinite(price) ||
    !Number.isFinite(promoPrice) ||
    price <= 0 ||
    promoPrice <= 0 ||
    promoPrice >= price
  ) {
    return null
  }
  const pct = Math.round(((price - promoPrice) / price) * 100)
  return pct > 0 && pct < 100 ? pct : null
}

/**
 * Resolves truthful pricing, valid discount metadata, and active plan ID
 * for both multi-plan and single-price storefront products.
 */
export function resolveProductDisplayPricing(
  product: StorefrontProduct,
  selectedPlan?: StorefrontProductPlan | null,
): ProductDisplayPricing {
  if (product.plansEnabled) {
    const active = product.activePlans.filter((p) => p.isActive && p.price > 0)
    if (active.length === 0) {
      return {
        finalPrice: null,
        originalPrice: null,
        discountPercent: null,
        formattedFinal: 'استعلام قیمت',
        formattedOriginal: null,
        isPromo: false,
        purchasable: false,
        planId: null,
        planTitle: null,
      }
    }
    const plan = selectedPlan ?? getDefaultPlan(product) ?? active[0]
    const finalPrice = effectiveUnitPrice(plan.price, plan.promoPrice)
    if (finalPrice === null) {
      return {
        finalPrice: null,
        originalPrice: null,
        discountPercent: null,
        formattedFinal: 'استعلام قیمت',
        formattedOriginal: null,
        isPromo: false,
        purchasable: false,
        planId: null,
        planTitle: null,
      }
    }
    const discountPercent = calculateValidDiscountPercent(plan.price, plan.promoPrice)
    const isPromo = discountPercent !== null
    return {
      finalPrice,
      originalPrice: isPromo ? plan.price : null,
      discountPercent,
      formattedFinal: formatStoreMoney(finalPrice, product.currency),
      formattedOriginal: isPromo ? formatStoreMoney(plan.price, product.currency) : null,
      isPromo,
      purchasable: true,
      planId: plan.id,
      planTitle: plan.title,
    }
  }

  const finalPrice = effectiveUnitPrice(product.price, product.promoPrice)
  if (finalPrice === null) {
    return {
      finalPrice: null,
      originalPrice: null,
      discountPercent: null,
      formattedFinal: 'تماس بگیرید',
      formattedOriginal: null,
      isPromo: false,
      purchasable: false,
      planId: null,
      planTitle: null,
    }
  }
  const discountPercent = calculateValidDiscountPercent(product.price, product.promoPrice)
  const isPromo = discountPercent !== null
  return {
    finalPrice,
    originalPrice: isPromo ? product.price : null,
    discountPercent,
    formattedFinal: formatStoreMoney(finalPrice, product.currency),
    formattedOriginal:
      isPromo && product.price !== null
        ? formatStoreMoney(product.price, product.currency)
        : null,
    isPromo,
    purchasable: true,
    planId: null,
    planTitle: null,
  }
}

/**
 * Clamps mouse/drag 3D frame rotation inside a comfortable front-facing viewing arc
 * so the product image always remains clearly visible and legible.
 */
export function clampShowcaseRotation(
  rawYaw: number,
  rawPitch: number,
  reducedMotion: boolean,
): ClampedShowcaseRotation {
  const maxYaw = reducedMotion ? 0.1 : 0.36
  const maxPitch = reducedMotion ? 0.04 : 0.14
  const safeYaw = Number.isFinite(rawYaw) ? rawYaw : 0
  const safePitch = Number.isFinite(rawPitch) ? rawPitch : 0
  return {
    yaw: Math.max(-maxYaw, Math.min(maxYaw, safeYaw)),
    pitch: Math.max(-maxPitch, Math.min(maxPitch, safePitch)),
  }
}

/**
 * Computes object-cover UV repeat & offset so an uploaded product image fills
 * the 3D glass display plane cleanly without stretching or distortion.
 */
export function computeCoverUvTransform(
  imageWidth: number,
  imageHeight: number,
  frameAspect: number,
): CoverUvTransform {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    !Number.isFinite(frameAspect) ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    frameAspect <= 0
  ) {
    return { repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0 }
  }

  const imageAspect = imageWidth / imageHeight
  if (Math.abs(imageAspect - frameAspect) < 0.001) {
    return { repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0 }
  }

  if (imageAspect > frameAspect) {
    const repeatX = frameAspect / imageAspect
    return {
      repeatX,
      repeatY: 1,
      offsetX: (1 - repeatX) * 0.5,
      offsetY: 0,
    }
  }

  const repeatY = imageAspect / frameAspect
  return {
    repeatX: 1,
    repeatY,
    offsetX: 0,
    offsetY: (1 - repeatY) * 0.5,
  }
}

/**
 * Resolves a subtle MR.ROBOT-aligned studio rim accent hex color for the 3D frame.
 */
export function resolveShowcaseAccentHex(
  slug: string,
  categorySlug?: string | null,
): string {
  const hay = `${slug} ${categorySlug ?? ''}`.toLowerCase()
  if (/chatgpt|openai/.test(hay)) return '#10a37f'
  if (/gemini|google/.test(hay)) return '#3b82f6'
  if (/capcut|video|edit/.test(hay)) return '#38bdf8'
  if (/vpn|v2ray|shield|proxy/.test(hay)) return '#0ea5e9'
  return '#e10600'
}

/**
 * Returns a clean 2-3 character monogram for products without an uploaded image.
 */
export function resolveProductMonogram(nameEn?: string | null, nameFa?: string | null): string {
  const en = (nameEn ?? '').trim()
  if (en.length > 0) {
    const words = en.split(/[\s\-_]+/).filter(Boolean)
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase()
    }
    return en.slice(0, 3).toUpperCase()
  }
  const fa = (nameFa ?? '').trim()
  return fa.length > 0 ? fa.slice(0, 2) : 'MR'
}
