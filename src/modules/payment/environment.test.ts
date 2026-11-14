import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isPaymentSandboxAllowed,
  signSandboxProof,
  verifySandboxProof,
} from './environment.ts'

test('sandbox disabled in production', () => {
  assert.equal(
    isPaymentSandboxAllowed({ NODE_ENV: 'production', ALLOW_PAYMENT_SANDBOX: 'true' }),
    false,
  )
})

test('sandbox needs explicit flag in development', () => {
  assert.equal(isPaymentSandboxAllowed({ NODE_ENV: 'development' }), false)
  assert.equal(isPaymentSandboxAllowed({ NODE_ENV: 'development', ALLOW_PAYMENT_SANDBOX: 'true' }), true)
})

test('sandbox proof verifies with AUTH_SECRET', () => {
  process.env.AUTH_SECRET = 'x'.repeat(32)
  process.env.ALLOW_PAYMENT_SANDBOX = 'true'
  process.env.NODE_ENV = 'development'
  const exp = Date.now() + 60_000
  const proof = signSandboxProof('pay-1', 500_000, exp)
  assert.equal(verifySandboxProof('pay-1', 500_000, exp, proof), true)
  assert.equal(verifySandboxProof('pay-1', 1, exp, proof), false)
})