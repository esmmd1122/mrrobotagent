import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
import { runSchemaParityCheck } from './compare-prisma-schemas.mjs'

test('schema.postgresql.prisma model blocks match schema.prisma', () => {
  const result = runSchemaParityCheck({
    sqlitePath: path.join('prisma', 'schema.prisma'),
    postgresPath: path.join('prisma', 'schema.postgresql.prisma'),
  })
  assert.equal(result.ok, true, result.errors.join('; '))
  assert.ok(result.modelCount >= 59)
})