'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { readCart, writeCart } from '@/modules/commerce/cart-cookie'

export async function addToCart(productId: string, quantity = 1, planId?: string | null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { plans: { where: { isActive: true } } },
  })
  const { isProductPurchasable } = await import('@/modules/commerce/product-pricing')
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
    redirect(`/subscriptions/${product?.slug ?? ''}?error=not-purchasable`)
  }

  if (product.plansEnabled) {
    if (!planId) redirect(`/subscriptions/${product.slug}?error=select_plan`)
    const plan = product.plans.find((p) => p.id === planId)
    if (!plan) redirect(`/subscriptions/${product.slug}?error=invalid_plan`)
  } else if (planId) {
    redirect(`/subscriptions/${product.slug}?error=invalid_plan`)
  }

  const lines = await readCart()
  const idx = lines.findIndex((l) => l.productId === productId && (l.planId || null) === (planId || null))
  const line = { productId, planId: planId || null, quantity: Math.min(99, Math.max(1, quantity)) }
  if (idx >= 0) {
    lines[idx] = { ...line, quantity: Math.min(99, lines[idx].quantity + quantity) }
  } else {
    lines.push(line)
  }
  await writeCart(lines)
  revalidatePath('/')
  revalidatePath('/cart')
  revalidatePath('/checkout')
}

export async function setCartQuantity(productId: string, quantity: number, planId?: string | null) {
  let lines = await readCart()
  const match = (l: { productId: string; planId?: string | null }) =>
    l.productId === productId && (l.planId || null) === (planId || null)
  if (quantity <= 0) {
    lines = lines.filter((l) => !match(l))
  } else {
    const idx = lines.findIndex(match)
    if (idx >= 0) lines[idx] = { productId, planId: planId || null, quantity: Math.min(99, quantity) }
  }
  await writeCart(lines)
  revalidatePath('/')
  revalidatePath('/cart')
  revalidatePath('/checkout')
}

export async function removeFromCart(productId: string, planId?: string | null) {
  const lines = (await readCart()).filter(
    (l) => !(l.productId === productId && (l.planId || null) === (planId || null)),
  )
  await writeCart(lines)
  revalidatePath('/')
  revalidatePath('/cart')
  revalidatePath('/checkout')
}

export async function goToCheckout() {
  const { validateCheckoutPricing } = await import('@/modules/commerce/pricing')
  const lines = await readCart()
  const check = await validateCheckoutPricing(lines)
  if (!check.ok) {
    redirect(`/cart?error=${encodeURIComponent(check.error)}`)
  }
  redirect('/checkout')
}