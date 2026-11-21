'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { MAX_CART_LINES, readCart, writeCart } from '@/modules/commerce/cart-cookie'
import { cartLineKey, priceCartLines, validateCheckoutPricing } from '@/modules/commerce/pricing'
import { isProductPurchasable } from '@/modules/commerce/product-pricing'

export type CartActionResult =
  | { ok: true; count: number; removedCount?: number }
  | { ok: false; code: string; error: string }

const uuidSchema = z.string().uuid()

function parseQuantity(raw: number): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  return Math.floor(raw)
}

function totalCount(lines: Array<{ quantity: number }>): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0)
}

export async function addToCart(
  productId: string,
  quantity = 1,
  planId?: string | null,
): Promise<CartActionResult> {
  if (!uuidSchema.safeParse(productId).success) {
    return { ok: false, code: 'INVALID_PRODUCT', error: 'شناسه محصول نامعتبر است.' }
  }
  const normalizedPlanId = planId?.trim() || null
  if (normalizedPlanId && !uuidSchema.safeParse(normalizedPlanId).success) {
    return { ok: false, code: 'INVALID_PLAN', error: 'طرح انتخاب‌شده نامعتبر است.' }
  }

  const parsedQty = parseQuantity(quantity)
  if (parsedQty == null || parsedQty < 1) {
    return { ok: false, code: 'INVALID_QUANTITY', error: 'تعداد واردشده نامعتبر است.' }
  }
  const safeQty = Math.min(99, parsedQty)

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { plans: { where: { isActive: true } } },
  })
  if (
    !product ||
    !isProductPurchasable({
      price: product.price,
      promoPrice: product.promoPrice,
      isAvailable: product.isAvailable,
      isVisible: product.isVisible,
      plansEnabled: product.plansEnabled,
      activePlans: product.plans,
    })
  ) {
    return {
      ok: false,
      code: 'NOT_PURCHASABLE',
      error: 'این محصول در حال حاضر برای خرید آنلاین فعال نیست.',
    }
  }

  if (product.plansEnabled) {
    if (!normalizedPlanId) {
      return {
        ok: false,
        code: 'SELECT_PLAN',
        error: 'لطفاً ابتدا یکی از طرح‌های فعال این اشتراک را انتخاب کنید.',
      }
    }
    const plan = product.plans.find((p) => p.id === normalizedPlanId)
    if (!plan || plan.price <= 0) {
      return {
        ok: false,
        code: 'INVALID_PLAN',
        error: 'طرح انتخاب‌شده معتبر یا فعال نیست.',
      }
    }
  } else if (normalizedPlanId) {
    return {
      ok: false,
      code: 'INVALID_PLAN',
      error: 'این محصول بدون طرح جداگانه عرضه می‌شود.',
    }
  }

  const lines = await readCart()
  const idx = lines.findIndex(
    (l) => l.productId === productId && (l.planId || null) === normalizedPlanId,
  )
  if (idx >= 0) {
    lines[idx] = {
      productId,
      planId: normalizedPlanId,
      quantity: Math.min(99, lines[idx].quantity + safeQty),
    }
  } else {
    if (lines.length >= MAX_CART_LINES) {
      return {
        ok: false,
        code: 'CART_FULL',
        error: 'حداکثر ظرفیت سبد خرید تکمیل شده است.',
      }
    }
    lines.push({ productId, planId: normalizedPlanId, quantity: safeQty })
  }

  await writeCart(lines)
  revalidatePath('/')
  revalidatePath('/shop')
  revalidatePath('/cart')
  revalidatePath('/checkout')
  return { ok: true, count: totalCount(lines) }
}

export async function setCartQuantity(
  productId: string,
  quantity: number,
  planId?: string | null,
): Promise<CartActionResult> {
  if (!uuidSchema.safeParse(productId).success) {
    return { ok: false, code: 'INVALID_PRODUCT', error: 'شناسه محصول نامعتبر است.' }
  }
  const parsedQty = parseQuantity(quantity)
  if (parsedQty == null) {
    return { ok: false, code: 'INVALID_QUANTITY', error: 'تعداد واردشده نامعتبر است.' }
  }
  const normalizedPlanId = planId?.trim() || null

  let lines = await readCart()
  const match = (l: { productId: string; planId?: string | null }) =>
    l.productId === productId && (l.planId || null) === normalizedPlanId

  if (parsedQty <= 0) {
    lines = lines.filter((l) => !match(l))
  } else {
    const idx = lines.findIndex(match)
    if (idx >= 0) {
      lines[idx] = { productId, planId: normalizedPlanId, quantity: Math.min(99, parsedQty) }
    }
  }

  await writeCart(lines)
  revalidatePath('/')
  revalidatePath('/cart')
  revalidatePath('/checkout')
  return { ok: true, count: totalCount(lines) }
}

export async function removeFromCart(
  productId: string,
  planId?: string | null,
): Promise<CartActionResult> {
  if (!uuidSchema.safeParse(productId).success) {
    return { ok: false, code: 'INVALID_PRODUCT', error: 'شناسه محصول نامعتبر است.' }
  }
  const normalizedPlanId = planId?.trim() || null
  const lines = (await readCart()).filter(
    (l) => !(l.productId === productId && (l.planId || null) === normalizedPlanId),
  )
  await writeCart(lines)
  revalidatePath('/')
  revalidatePath('/cart')
  revalidatePath('/checkout')
  return { ok: true, count: totalCount(lines) }
}

export async function pruneUnavailableCartItems(): Promise<CartActionResult> {
  const lines = await readCart()
  if (lines.length === 0) {
    return { ok: true, count: 0, removedCount: 0 }
  }
  const priced = await priceCartLines(lines)
  const validKeys = new Set(priced.filter((p) => p.available).map((p) => cartLineKey(p)))
  const kept = lines.filter((l) => validKeys.has(cartLineKey(l)))
  const removedCount = lines.length - kept.length
  await writeCart(kept)
  revalidatePath('/')
  revalidatePath('/cart')
  revalidatePath('/checkout')
  return { ok: true, count: totalCount(kept), removedCount }
}

export async function goToCheckout() {
  const lines = await readCart()
  const check = await validateCheckoutPricing(lines)
  if (!check.ok) {
    redirect(`/cart?error=${encodeURIComponent(check.error)}`)
  }
  redirect('/checkout')
}