import test from 'node:test'
import assert from 'node:assert/strict'
import { assertNoInternalFields } from './customer-order-sanitize.ts'

test('customer order view rejects internal fields', () => {
  assert.throws(
    () =>
      assertNoInternalFields({
        orderNumber: 'MR-1',
        adminNotes: 'secret',
      }),
    /INTERNAL_FIELD_LEAK/,
  )
  assert.throws(
    () =>
      assertNoInternalFields({
        fulfillment: { internalNotes: 'ops only' },
      }),
    /INTERNAL_FIELD_LEAK/,
  )
  assert.doesNotThrow(() =>
    assertNoInternalFields({
      orderNumber: 'MR-1',
      fulfillment: { deliveryInfo: 'ok', status: 'PENDING' },
    }),
  )
})