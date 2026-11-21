import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeAppOrigin } from './origin-safety.ts'

test('sanitizeAppOrigin prefers configured valid APP_URL over headers', () => {
  const origin = sanitizeAppOrigin({
    forwardedProto: 'http',
    forwardedHost: 'evil.example',
    envAppUrl: 'https://mrrobot.example/some/path',
  })
  assert.equal(origin, 'https://mrrobot.example')
})

test('sanitizeAppOrigin rejects forged hosts and invalid protocols', () => {
  assert.equal(
    sanitizeAppOrigin({
      forwardedProto: 'javascript',
      forwardedHost: 'evil.com/path@good.com',
    }),
    'http://localhost:3000',
  )
  assert.equal(
    sanitizeAppOrigin({
      forwardedProto: 'https',
      forwardedHost: 'mrrobot.ir:8443',
    }),
    'https://mrrobot.ir:8443',
  )
})
