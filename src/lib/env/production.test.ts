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

test('vercel preview skips production fail-closed', () => {
  assert.deepEqual(
    productionProblems({
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      DATABASE_URL: 'file:./dev.db',
      OTP_DEV_REVEAL: 'true',
    }),
    [],
  )
})

test('store-only production skips salon infrastructure requirements', () => {
  const problems = productionProblems({
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    DATABASE_URL: 'postgresql://x',
    AUTH_SECRET: 'a'.repeat(32),
    MR_ROBOT_STORE_ONLY: 'true',
  })
  assert.deepEqual(problems, [])
})
