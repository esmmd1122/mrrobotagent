import test from 'node:test'
import assert from 'node:assert/strict'

test('confirmation fallback URL encodes payment errors', () => {
  const orderNumber = 'MR-90001'
  const token = 'a'.repeat(32)
  const confirmation = `/orders/confirmation?orderNumber=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(token)}`
  const code = 'NO_GATEWAY'
  const message = 'هیچ درگاه'
  const url = `${confirmation}&payError=${encodeURIComponent(code)}&payMsg=${encodeURIComponent(message)}`
  assert.match(url, /payError=NO_GATEWAY/)
  assert.match(url, /payMsg=/)
})