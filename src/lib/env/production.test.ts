import assert from 'node:assert/strict'
import test from 'node:test'
import { productionProblems } from './production.ts'

test('production rejects sqlite, missing redis, and OTP reveal', () => {
  const problems = productionProblems({
    NODE_ENV: 'production',
    DATABASE_URL: 'file:./dev.db',
    AUTH_SECRET: 'change-me-to-a-long-random-secret-at-least-32-chars',
    OTP_DEV_REVEAL: 'true',
  })
  assert.ok(problems.includes('DATABASE_URL'))
  assert.ok(problems.includes('REDIS_URL'))
  assert.ok(problems.includes('OTP_DEV_REVEAL'))
  assert.ok(problems.includes('AUTH_SECRET'))
  assert.ok(problems.includes('S3_STORAGE'))
})

test('development does not fail closed', () => {
  assert.deepEqual(productionProblems({ NODE_ENV: 'development', OTP_DEV_REVEAL: 'true' }), [])
})
