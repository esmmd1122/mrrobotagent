import test from 'node:test'
import assert from 'node:assert/strict'
import { effectiveUnitPrice } from './unit-price.ts'
import { generateOrderNumber } from './order-number.ts'

test('effectiveUnitPrice prefers promo when set', () => {
  assert.equal(effectiveUnitPrice(100_000, 80_000), 80_000)
  assert.equal(effectiveUnitPrice(100_000, null), 100_000)
  assert.equal(effectiveUnitPrice(null, null), null)
})

test('generateOrderNumber format', () => {
  const n = generateOrderNumber()
  assert.match(n, /^MR-\d{6}-[0-9A-F]{4}$/)
})