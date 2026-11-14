import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertFulfillmentTransition,
  canAssignFulfillment,
  deriveOrderStatusAfterFulfillment,
} from './rules.ts'

test('unpaid order cannot complete fulfillment', () => {
  const r = assertFulfillmentTransition('UNPAID', 'COMPLETED')
  assert.equal(r.ok, false)
})

test('paid order can complete fulfillment', () => {
  const r = assertFulfillmentTransition('PAID', 'COMPLETED')
  assert.equal(r.ok, true)
})

test('unpaid cannot enter processing', () => {
  const r = assertFulfillmentTransition('UNPAID', 'PROCESSING')
  assert.equal(r.ok, false)
})

test('assign requires payment', () => {
  assert.equal(canAssignFulfillment('PAID'), true)
  assert.equal(canAssignFulfillment('UNPAID'), false)
})

test('order status only completes when paid and fulfillment completed', () => {
  assert.equal(
    deriveOrderStatusAfterFulfillment({
      paymentStatus: 'UNPAID',
      fulfillmentStatus: 'COMPLETED',
      currentOrderStatus: 'PENDING_PAYMENT',
    }),
    'PENDING_PAYMENT',
  )
  assert.equal(
    deriveOrderStatusAfterFulfillment({
      paymentStatus: 'PAID',
      fulfillmentStatus: 'COMPLETED',
      currentOrderStatus: 'PAID',
    }),
    'COMPLETED',
  )
})