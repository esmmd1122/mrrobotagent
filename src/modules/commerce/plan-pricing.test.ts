import test from 'node:test'
import assert from 'node:assert/strict'
import { cartLineKey, cartPricingMismatch } from './plan-line-keys.ts'
import { effectiveUnitPrice } from './unit-price.ts'

test('cart lines with different plans are distinct keys', () => {
  assert.notEqual(cartLineKey({ productId: 'p1', planId: 'a' }), cartLineKey({ productId: 'p1', planId: 'b' }))
  assert.equal(cartLineKey({ productId: 'p1' }), cartLineKey({ productId: 'p1', planId: null }))
})

test('cartPricingMismatch detects missing priced plan line', () => {
  const cart = [
    { productId: 'p1', planId: 'plan-a', quantity: 1 },
    { productId: 'p1', planId: 'plan-b', quantity: 1 },
  ]
  const priced = [
    {
      productId: 'p1',
      planId: 'plan-a',
      slug: 's',
      productName: 'P',
      name: 'P',
      quantity: 1,
      listUnitPrice: 100,
      unitPrice: 100,
      lineTotal: 100,
      available: true,
    },
  ]
  assert.equal(cartPricingMismatch(cart, priced), true)
})

test('order snapshot unit price is independent of future promo changes', () => {
  const snapUnit = effectiveUnitPrice(1500000, 1200000)
  const futureUnit = effectiveUnitPrice(2000000, null)
  assert.equal(snapUnit, 1200000)
  assert.notEqual(snapUnit, futureUnit)
})