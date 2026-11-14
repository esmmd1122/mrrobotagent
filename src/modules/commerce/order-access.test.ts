import test from 'node:test'
import assert from 'node:assert/strict'
import { hashOrderViewToken, verifyOrderViewToken } from './view-token.ts'

test('order view token hash verifies with timing-safe compare', () => {
  process.env.AUTH_SECRET = 'y'.repeat(32)
  const token = 'test-view-token-value'
  const hash = hashOrderViewToken(token)
  assert.equal(verifyOrderViewToken(token, hash), true)
  assert.equal(verifyOrderViewToken('wrong', hash), false)
})