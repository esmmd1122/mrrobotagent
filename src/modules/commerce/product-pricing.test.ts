import test from 'node:test'
import assert from 'node:assert/strict'
import { isPurchasableProduct, isProductPurchasable } from './unit-price.ts'
import { cartPricingMismatch } from './plan-line-keys.ts'

test('contact-only products are not purchasable online', () => {
  assert.equal(
    isPurchasableProduct({
      price: null,
      promoPrice: null,
      isAvailable: true,
      isVisible: true,
    }),
    false,
  )
  assert.equal(
    isPurchasableProduct({
      price: 1000,
      promoPrice: null,
      isAvailable: true,
      isVisible: true,
    }),
    true,
  )
})

test('multi-plan product without legacy price can be purchasable', () => {
  assert.equal(
    isProductPurchasable({
      price: null,
      promoPrice: null,
      isAvailable: true,
      isVisible: true,
      plansEnabled: true,
      activePlans: [{ price: 4200000, promoPrice: null, isActive: true }],
    }),
    true,
  )
})

test('cart mismatch detects stale unpurchasable lines', () => {
  const cart = [
    { productId: 'a', quantity: 1 },
    { productId: 'b', quantity: 1 },
  ]
  const priced = [
    {
      productId: 'a',
      planId: null,
      slug: 's',
      productName: 'A',
      name: 'A',
      quantity: 1,
      listUnitPrice: 1,
      unitPrice: 1,
      lineTotal: 1,
      available: true,
    },
  ]
  assert.equal(cartPricingMismatch(cart, priced), true)
})