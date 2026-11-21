import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { productionProblems } from './production'

test('OPENAI_API_KEY and NEXT_PUBLIC_MR_ROBOT_MODEL_URL are never required by production env validation', () => {
  const problems = productionProblems({
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    DATABASE_URL: 'postgresql://example.invalid/db',
    AUTH_SECRET: 'a'.repeat(32),
    MR_ROBOT_STORE_ONLY: 'true',
  })
  assert.deepEqual(problems, [])
})

test('.env.example does not declare optional integrations as mandatory active keys', () => {
  const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8')
  const activeKeys = envExample
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')[0]?.trim())

  assert.equal(activeKeys.includes('OPENAI_API_KEY'), false)
  assert.equal(activeKeys.includes('NEXT_PUBLIC_MR_ROBOT_MODEL_URL'), false)
  assert.equal(activeKeys.includes('IC_MR_ROBOT_MODEL_URL'), false)
  // Core pre-existing keys remain intact
  assert.ok(activeKeys.includes('DATABASE_URL'))
  assert.ok(activeKeys.includes('AUTH_SECRET'))
})
