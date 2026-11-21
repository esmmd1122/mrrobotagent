import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveProductDisplayPrice } from './display-price.ts'

test('multi-plan product with null legacy price resolves lowest active plan price', () => {
  const result = resolveProductDisplayPrice({
    price: null,
    promoPrice: null,
    isAvailable: true,
    isVisible: true,
    plansEnabled: true,
    plans: [
      { id: 'plan-1m', price: 1_200_000, promoPrice: null, isActive: true, isFeatured: false },
      { id: 'plan-3m', price: 3_200_000, promoPrice: 2_900_000, isActive: true, isFeatured: true },
    ],
  })
  assert.equal(result.purchasable, true)
  assert.equal(result.unitPrice, 1_200_000)
  assert.equal(result.isFromPrice, true)
  assert.equal(result.defaultPlanId, 'plan-3m')
  assert.equal(result.activePlanCount, 2)
})

test('multi-plan product ignores inactive plans and prefers promo price', () => {
  const result = resolveProductDisplayPrice({
    price: null,
    promoPrice: null,
    isAvailable: true,
    isVisible: true,
    plansEnabled: true,
    plans: [
      { id: 'plan-old', price: 500_000, promoPrice: null, isActive: false },
      { id: 'plan-active', price: 1_500_000, promoPrice: 1_100_000, isActive: true },
    ],
  })
  assert.equal(result.purchasable, true)
  assert.equal(result.unitPrice, 1_100_000)
  assert.equal(result.listPrice, 1_500_000)
  assert.equal(result.isFromPrice, false)
  assert.equal(result.defaultPlanId, 'plan-active')
})

test('contact-only product with null price and no plans is not purchasable', () => {
  const result = resolveProductDisplayPrice({
    price: null,
    promoPrice: null,
    isAvailable: true,
    isVisible: true,
    plansEnabled: false,
    plans: [],
  })
  assert.equal(result.purchasable, false)
  assert.equal(result.unitPrice, null)
})

test('legacy single-price product with promo price returns discounted unit and list price', () => {
  const result = resolveProductDisplayPrice({
    price: 2_000_000,
    promoPrice: 1_750_000,
    isAvailable: true,
    isVisible: true,
    plansEnabled: false,
    plans: [],
  })
  assert.equal(result.purchasable, true)
  assert.equal(result.unitPrice, 1_750_000)
  assert.equal(result.listPrice, 2_000_000)
  assert.equal(result.defaultPlanId, null)
})
