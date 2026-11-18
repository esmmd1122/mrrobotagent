import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import {
  normalizeCellValue,
  findOccupiedTables,
  migrateSqliteToPostgres,
  validatePostgresAgainstPrisma,
  formatMigrationFailureReport,
} from './pg-migrate-core.mjs'

test('normalizeCellValue handles booleans and epoch ms window', () => {
  assert.equal(normalizeCellValue(1, 'BOOLEAN'), true)
  assert.equal(normalizeCellValue(0, 'BOOLEAN'), false)
  const iso = normalizeCellValue(1_700_000_000_000, 'DATETIME')
  assert.match(String(iso), /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(normalizeCellValue(42, 'INTEGER'), 42)
})

test('refuses duplicate execution on non-empty target', async () => {
  const client = {
    queries: [],
    async query(sql, params) {
      this.queries.push({ sql, params })
      if (sql.includes('information_schema.tables')) return { rowCount: 1 }
      if (sql.includes('information_schema.columns'))
        return { rows: [{ column_name: 'id', data_type: 'text', is_nullable: 'NO' }] }
      if (sql.includes('COUNT(*)')) return { rows: [{ count: 5 }] }
      return { rows: [] }
    },
  }
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('CREATE TABLE "Product" (id TEXT PRIMARY KEY)')
  const models = new Map([['Product', new Set(['id'])]])
  const report = await migrateSqliteToPostgres({ sqlite, client, prismaModels: models })
  assert.equal(report.status, 'refused_non_empty')
  assert.equal(client.queries.some((q) => q.sql === 'BEGIN'), false)
  sqlite.close()
})

test('rolls back on failure mid-migration', async () => {
  let insertCount = 0
  let rolledBack = false
  const client = {
    async query(sql) {
      if (sql === 'BEGIN') return {}
      if (sql === 'ROLLBACK') {
        rolledBack = true
        return {}
      }
      if (sql.includes('information_schema.tables')) return { rowCount: 1 }
      if (sql.includes('information_schema.columns'))
        return { rows: [{ column_name: 'id', data_type: 'text', is_nullable: 'NO' }] }
      if (sql.includes('COUNT(*)')) return { rows: [{ count: 0 }] }
      if (sql.startsWith('INSERT')) {
        insertCount += 1
        if (insertCount > 1) throw new Error('simulated interrupt')
      }
      return { rows: [] }
    },
  }
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('CREATE TABLE "Product" (id TEXT PRIMARY KEY)')
  sqlite.exec('CREATE TABLE "Customer" (id TEXT PRIMARY KEY)')
  sqlite.exec(`INSERT INTO "Product" VALUES ('a'), ('b')`)
  const models = new Map([
    ['Product', new Set(['id'])],
    ['Customer', new Set(['id'])],
  ])
  await assert.rejects(() => migrateSqliteToPostgres({ sqlite, client, prismaModels: models }), /simulated interrupt/)
  assert.equal(rolledBack, true)
  sqlite.close()
})

test('detects missing postgres table before any insert', async () => {
  const client = {
    queries: [],
    async query(sql, params) {
      this.queries.push({ sql, params })
      if (sql.includes('information_schema.tables')) {
        if (params?.[0] === 'Customer') return { rowCount: 0 }
        return { rowCount: 1 }
      }
      if (sql.includes('information_schema.columns'))
        return { rows: [{ column_name: 'id', data_type: 'text', is_nullable: 'NO' }] }
      if (sql.includes('COUNT(*)')) return { rows: [{ count: 0 }] }
      return { rows: [] }
    },
  }
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(`CREATE TABLE "Product" (id TEXT PRIMARY KEY);
    CREATE TABLE "Customer" (id TEXT PRIMARY KEY)`)
  const models = new Map([
    ['Product', new Set(['id'])],
    ['Customer', new Set(['id'])],
  ])
  await assert.rejects(
    () => migrateSqliteToPostgres({ sqlite, client, prismaModels: models }),
  (err) => {
      assert.match(err.message, /Postgres schema drift vs Prisma/)
      assert.match(err.message, /tables=Customer/)
      assert.match(err.message, /cols=/)
      return true
    },
  )
  assert.equal(client.queries.some((q) => q.sql === 'BEGIN'), false)
  assert.equal(client.queries.some((q) => q.sql?.startsWith('INSERT')), false)
  sqlite.close()
})

test('detects missing postgres columns', async () => {
  const client = {
    async query(sql) {
      if (sql.includes('information_schema.tables')) return { rowCount: 1 }
      if (sql.includes('information_schema.columns')) return { rows: [{ column_name: 'id', data_type: 'text', is_nullable: 'NO' }] }
      return { rows: [] }
    },
  }
  const models = new Map([['Product', new Set(['id', 'nameFa'])]])
  const v = await validatePostgresAgainstPrisma(client, models)
  assert.equal(v.ok, false)
  assert.deepEqual(v.missingColumns, ['Product.nameFa'])
})

test('foreign-key order inserts parent before child', async () => {
  const storage = new Map()
  const client = {
    async query(sql, params) {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {}
      if (sql.includes('information_schema.tables')) return { rowCount: 1 }
      if (sql.includes('information_schema.columns')) {
        if (params?.[0] === 'Order')
          return {
            rows: [
              { column_name: 'id', data_type: 'text', is_nullable: 'NO' },
              { column_name: 'customerId', data_type: 'text', is_nullable: 'YES' },
            ],
          }
        return { rows: [{ column_name: 'id', data_type: 'text', is_nullable: 'NO' }] }
      }
      if (sql.includes('COUNT(*)')) {
        const m = sql.match(/FROM "(\w+)"/)
        const table = m[1]
        return { rows: [{ count: storage.get(table) ?? 0 }] }
      }
      if (sql.startsWith('INSERT')) {
        const m = sql.match(/INSERT INTO "(\w+)"/)
        const table = m[1]
        storage.set(table, (storage.get(table) ?? 0) + 1)
      }
      return { rows: [] }
    },
  }
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(`CREATE TABLE "Customer" (id TEXT PRIMARY KEY);
    CREATE TABLE "Order" (id TEXT PRIMARY KEY, customerId TEXT, FOREIGN KEY(customerId) REFERENCES "Customer"(id));
    INSERT INTO "Customer" VALUES ('c1');
    INSERT INTO "Order" VALUES ('o1', 'c1');`)
  const models = new Map([
    ['Customer', new Set(['id'])],
    ['Order', new Set(['id', 'customerId'])],
  ])
  const report = await migrateSqliteToPostgres({ sqlite, client, prismaModels: models })
  assert.equal(report.status, 'committed')
  assert.equal(storage.get('Customer'), 1)
  assert.equal(storage.get('Order'), 1)
  sqlite.close()
})

test('rolls back on runtime foreign key violation with failure report', async () => {
  const fkReason = 'insert or update on table "Order" violates foreign key constraint "Order_customerId_fkey"'
  const storage = new Map()
  let rolledBack = false
  const client = {
    async query(sql, params) {
      if (sql === 'BEGIN') return {}
      if (sql === 'ROLLBACK') {
        rolledBack = true
        storage.clear()
        return {}
      }
      if (sql === 'COMMIT') return {}
      if (sql.includes('information_schema.tables')) return { rowCount: 1 }
      if (sql.includes('information_schema.columns')) {
        if (params?.[0] === 'Order')
          return {
            rows: [
              { column_name: 'id', data_type: 'text', is_nullable: 'NO' },
              { column_name: 'customerId', data_type: 'text', is_nullable: 'YES' },
            ],
          }
        return { rows: [{ column_name: 'id', data_type: 'text', is_nullable: 'NO' }] }
      }
      if (sql.includes('COUNT(*)')) {
        const m = sql.match(/FROM "(\w+)"/)
        const table = m[1]
        return { rows: [{ count: storage.get(table) ?? 0 }] }
      }
      if (sql.startsWith('INSERT')) {
        const m = sql.match(/INSERT INTO "(\w+)"/)
        const table = m[1]
        if (table === 'Order') throw new Error(fkReason)
        storage.set(table, (storage.get(table) ?? 0) + 1)
      }
      return { rows: [] }
    },
  }
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(`CREATE TABLE "Customer" (id TEXT PRIMARY KEY);
    CREATE TABLE "Order" (id TEXT PRIMARY KEY, customerId TEXT, FOREIGN KEY(customerId) REFERENCES "Customer"(id));
    INSERT INTO "Customer" VALUES ('c1');
    INSERT INTO "Order" VALUES ('o1', 'c1');`)
  const models = new Map([
    ['Customer', new Set(['id'])],
    ['Order', new Set(['id', 'customerId'])],
  ])
  const expectedReport = formatMigrationFailureReport({ failedTable: 'Order', reason: fkReason })
  await assert.rejects(() => migrateSqliteToPostgres({ sqlite, client, prismaModels: models }), (err) => {
    assert.equal(err.message, expectedReport)
    return true
  })
  assert.equal(rolledBack, true)
  assert.equal(storage.size, 0)
  sqlite.close()
})