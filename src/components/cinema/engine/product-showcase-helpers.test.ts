import test from 'node:test'
import assert from 'node:assert/strict'
import type { StorefrontProduct } from '@/lib/mappers/product'
import {
  calculateValidDiscountPercent,
  clampShowcaseRotation,
  computeCoverUvTransform,
  resolveProductDisplayPricing,
  resolveProductMonogram,
  resolveShowcaseAccentHex,
} from './product-showcase-helpers'

function makeProduct(overrides: Partial<StorefrontProduct> = {}): StorefrontProduct {
  return {
    id: 'prod-1',
    slug: 'chatgpt-plus',
    name: 'چت جی پی تی پلاس',
    nameEn: 'ChatGPT Plus',
    description: 'اشتراک رسمی هوش مصنوعی',
    details: [],
    features: [],
    imageUrl: null,
    currency: 'IRR',
    price: 1500000,
    promoPrice: null,
    plansEnabled: false,
    purchaseFields: [],
    activePlans: [],
    isAvailable: true,
    categoryId: 'cat-ai',
    categorySlug: 'ai',
    categoryNameFa: 'هوش مصنوعی',
    ...overrides,
  }
}

test('calculateValidDiscountPercent returns integer percent only for strictly lower positive promoPrice', () => {
  assert.equal(calculateValidDiscountPercent(1000000, 800000), 20)
  assert.equal(calculateValidDiscountPercent(1000000, 1000000), null)
  assert.equal(calculateValidDiscountPercent(1000000, 1200000), null)
  assert.equal(calculateValidDiscountPercent(1000000, 0), null)
  assert.equal(calculateValidDiscountPercent(1000000, null), null)
  assert.equal(calculateValidDiscountPercent(null, 500000), null)
})

test('resolveProductDisplayPricing handles regular, promo, and multi-plan products cleanly', () => {
  const regular = resolveProductDisplayPricing(makeProduct({ price: 1200000, promoPrice: null }))
  assert.equal(regular.purchasable, true)
  assert.equal(regular.isPromo, false)
  assert.equal(regular.discountPercent, null)
  assert.equal(regular.originalPrice, null)

  const discounted = resolveProductDisplayPricing(
    makeProduct({ price: 2000000, promoPrice: 1500000 }),
  )
  assert.equal(discounted.isPromo, true)
  assert.equal(discounted.discountPercent, 25)
  assert.equal(discounted.finalPrice, 1500000)
  assert.equal(discounted.originalPrice, 2000000)
  assert.ok(discounted.formattedOriginal !== null)

  const multiPlan = resolveProductDisplayPricing(
    makeProduct({
      plansEnabled: true,
      price: null,
      activePlans: [
        {
          id: 'plan-1m',
          title: 'یک‌ماهه',
          durationDays: 30,
          price: 1000000,
          promoPrice: 850000,
          isActive: true,
          isFeatured: true,
          sortOrder: 0,
        },
      ],
    }),
  )
  assert.equal(multiPlan.planId, 'plan-1m')
  assert.equal(multiPlan.discountPercent, 15)
  assert.equal(multiPlan.finalPrice, 850000)
})

test('clampShowcaseRotation keeps image frame within front-facing arc and dampens for reducedMotion', () => {
  const full = clampShowcaseRotation(1.5, -0.9, false)
  assert.equal(full.yaw, 0.36)
  assert.equal(full.pitch, -0.14)

  const reduced = clampShowcaseRotation(1.5, -0.9, true)
  assert.equal(reduced.yaw, 0.1)
  assert.equal(reduced.pitch, -0.04)

  const safeNaN = clampShowcaseRotation(Number.NaN, Number.POSITIVE_INFINITY, false)
  assert.equal(safeNaN.yaw, 0)
  assert.equal(safeNaN.pitch, 0)
})

test('computeCoverUvTransform preserves aspect ratio without stretching for wide, tall, and matching images', () => {
  const matching = computeCoverUvTransform(1600, 1000, 1.6)
  assert.equal(matching.repeatX, 1)
  assert.equal(matching.repeatY, 1)
  assert.equal(matching.offsetX, 0)
  assert.equal(matching.offsetY, 0)

  const wide = computeCoverUvTransform(3200, 1000, 1.6)
  assert.equal(wide.repeatX, 0.5)
  assert.equal(wide.repeatY, 1)
  assert.equal(wide.offsetX, 0.25)
  assert.equal(wide.offsetY, 0)

  const square = computeCoverUvTransform(1000, 1000, 1.6)
  assert.equal(square.repeatX, 1)
  assert.equal(square.repeatY, 0.625)
  assert.equal(square.offsetX, 0)
  assert.ok(Math.abs(square.offsetY - 0.1875) < 1e-6)
})

test('resolveShowcaseAccentHex and resolveProductMonogram produce clean defaults', () => {
  assert.equal(resolveShowcaseAccentHex('chatgpt-plus', 'ai'), '#10a37f')
  assert.equal(resolveShowcaseAccentHex('custom-service', 'other'), '#e10600')
  assert.equal(resolveProductMonogram('ChatGPT Plus', 'چت جی پی تی'), 'CP')
  assert.equal(resolveProductMonogram('', 'سرویس جدید'), 'سر')
})
