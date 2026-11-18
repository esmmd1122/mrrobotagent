import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { buildTableInsertOrder } from './sqlite-table-order.mjs'

test('orders parent before child via foreign keys', () => {
  const db = new DatabaseSync(':memory:')
  db.exec(`CREATE TABLE "Customer" (id TEXT PRIMARY KEY);
    CREATE TABLE "Order" (id TEXT PRIMARY KEY, customerId TEXT, FOREIGN KEY(customerId) REFERENCES "Customer"(id));`)
  const { ordered } = buildTableInsertOrder(db, ['Order', 'Customer'])
  assert.ok(ordered.indexOf('Customer') < ordered.indexOf('Order'))
  db.close()
})

test('reports cycles when self-referencing', () => {
  const db = new DatabaseSync(':memory:')
  db.exec(`CREATE TABLE "Node" (id TEXT PRIMARY KEY, parentId TEXT, FOREIGN KEY(parentId) REFERENCES "Node"(id));`)
  const { ordered, cycles } = buildTableInsertOrder(db, ['Node'])
  assert.deepEqual(ordered, ['Node'])
  assert.deepEqual(cycles, ['Node'])
  db.close()
})