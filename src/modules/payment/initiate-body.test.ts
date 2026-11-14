import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'crypto'
import { z } from 'zod'

const bodySchema = z.object({
  orderNumber: z.string().min(4).max(40),
  viewToken: z.string().min(16).max(200).optional(),
  idempotencyKey: z.string().uuid(),
})

test('payment initiate body allows session flow without viewToken', () => {
  const parsed = bodySchema.safeParse({
    orderNumber: 'MR-10001',
    idempotencyKey: randomUUID(),
  })
  assert.equal(parsed.success, true)
})

test('payment initiate body still accepts guest viewToken', () => {
  const parsed = bodySchema.safeParse({
    orderNumber: 'MR-10001',
    viewToken: 'a'.repeat(32),
    idempotencyKey: randomUUID(),
  })
  assert.equal(parsed.success, true)
})