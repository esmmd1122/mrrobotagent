import test from 'node:test'
import assert from 'node:assert/strict'
import { SignJWT } from 'jose'
import { verifyCustomerSessionToken, createCustomerSessionToken } from './session-token.ts'
import { CUSTOMER_JWT_KIND } from './constants.ts'

test('customer session rejects admin-shaped token without kind', async () => {
  process.env.AUTH_SECRET = 'y'.repeat(32)
  const adminLike = await new SignJWT({ sub: 'x', email: 'a@b.com', name: 'A', roleSlug: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET))
  assert.equal(await verifyCustomerSessionToken(adminLike), null)
})

test('customer session verifies kind customer', async () => {
  process.env.AUTH_SECRET = 'y'.repeat(32)
  const token = await createCustomerSessionToken({
    sub: 'cust-1',
    email: 'u@example.com',
    name: 'User',
  })
  const payload = await verifyCustomerSessionToken(token)
  assert.ok(payload)
  assert.equal(payload!.sub, 'cust-1')
  assert.equal(payload!.kind, CUSTOMER_JWT_KIND)
})