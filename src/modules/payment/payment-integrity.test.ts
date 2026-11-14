import test from 'node:test'
import assert from 'node:assert/strict'
import { validateAdminOrderPaymentUpdate } from './payment-integrity.ts'

test('admin cannot set PAID without verified payment', () => {
  assert.equal(validateAdminOrderPaymentUpdate({ nextPaymentStatus: 'PAID', hasVerifiedPayment: false }).ok, false)
  assert.equal(validateAdminOrderPaymentUpdate({ nextPaymentStatus: 'PAID', hasVerifiedPayment: true }).ok, true)
  assert.equal(validateAdminOrderPaymentUpdate({ nextPaymentStatus: 'UNPAID', hasVerifiedPayment: false }).ok, true)
})