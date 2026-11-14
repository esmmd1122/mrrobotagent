import { validateDiscountCode } from './discount'
import type { CartLineInput, CartPricing, PricedCartLine } from './types'
import { STORE_CURRENCY_CODE } from './money'
import { priceCartLines, cartPricingMismatch } from './plan-pricing'
export { priceCartLines, cartPricingMismatch, cartLineKey } from './plan-pricing'
export { effectiveUnitPrice } from './unit-price'
export { formatStoreMoney, STORE_CURRENCY_CODE, STORE_CURRENCY_LABEL_FA } from './money'
export { isPurchasableProduct, isProductPurchasable } from './product-pricing'

export async function calculateCartPricing(
  lines: CartLineInput[],
  discountCode?: string | null,
): Promise<CartPricing> {
  const pricedLines = await priceCartLines(lines)
  const subtotal = pricedLines.reduce((s, l) => s + l.lineTotal, 0)

  const discount = await validateDiscountCode(discountCode, pricedLines, subtotal)

  return {
    lines: pricedLines,
    subtotal,
    discountAmount: discount.amount,
    total: Math.max(0, subtotal - discount.amount),
    discountCode: discount.code,
    currency: STORE_CURRENCY_CODE,
  }
}

export type CheckoutPricingResult =
  | { ok: true; pricing: CartPricing }
  | { ok: false; error: string }

/** Server-side guard before checkout: cart must match current DB prices and purchasability. */
export async function validateCheckoutPricing(
  lines: CartLineInput[],
  discountCode?: string | null,
): Promise<CheckoutPricingResult> {
  if (lines.length === 0) {
    return { ok: false, error: 'سبد خرید خالی است.' }
  }
  const pricedLines = await priceCartLines(lines)
  if (cartPricingMismatch(lines, pricedLines)) {
    return {
      ok: false,
      error: 'برخی اقلام سبد دیگر قابل خرید نیستند یا قیمت تعیین‌شده ندارند. سبد را به‌روز کنید.',
    }
  }
  if (pricedLines.some((l) => !l.available)) {
    return { ok: false, error: 'برخی اقلام سبد موجود نیستند.' }
  }
  const pricing = await calculateCartPricing(lines, discountCode)
  if (pricing.lines.length === 0 || pricing.total <= 0) {
    return { ok: false, error: 'مبلغ سفارش نامعتبر است. محصولات تماس‌گیری را از طریق پشتیبانی خریداری کنید.' }
  }
  return { ok: true, pricing }
}