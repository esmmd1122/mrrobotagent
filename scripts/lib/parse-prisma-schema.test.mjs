import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
import { loadPrismaModels } from './parse-prisma-schema.mjs'

test('loadPrismaModels includes store models and scalar fields', () => {
  const models = loadPrismaModels(path.join('prisma', 'schema.prisma'))
  assert.ok(models.has('Product'))
  assert.ok(models.get('Product').has('slug'))
  assert.ok(models.get('Product').has('plansEnabled'))
  assert.ok(models.size >= 50)
})