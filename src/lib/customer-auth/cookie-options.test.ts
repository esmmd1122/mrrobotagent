import test from 'node:test'
import assert from 'node:assert/strict'
import { customerSessionCookieOptions } from './cookie-options.ts'

test('customer session cookie is secure in production only', () => {
  const dev = customerSessionCookieOptions('development')
  const prod = customerSessionCookieOptions('production')
  assert.equal(dev.httpOnly, true)
  assert.equal(dev.secure, false)
  assert.equal(prod.secure, true)
  assert.equal(dev.sameSite, 'lax')
})