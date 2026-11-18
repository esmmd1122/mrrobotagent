import { buildTableInsertOrder } from './sqlite-table-order.mjs'

export function listSqliteColumns(sqlite, table) {
  return sqlite.prepare(`PRAGMA table_info("${table}")`).all().map((c) => ({
    name: c.name,
    type: (c.type || '').toUpperCase(),
    notnull: Boolean(c.notnull),
  }))
}

export function sqliteTableNames(sqlite) {
  return sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name",
    )
    .all()
    .map((r) => r.name)
}

export async function fetchPostgresColumns(client, table) {
  const res = await client.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  )
  return res.rows.map((r) => ({
    name: r.column_name,
    type: r.data_type,
    notnull: r.is_nullable === 'NO',
  }))
}

export async function postgresTableExists(client, table) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  )
  return res.rowCount > 0
}

/**
 * Compare Prisma models to Postgres public schema (tables + columns).
 */
export async function validatePostgresAgainstPrisma(client, prismaModels) {
  const missingTables = []
  const missingColumns = []
  const extraIssues = []

  for (const [model, fields] of prismaModels) {
    const exists = await postgresTableExists(client, model)
    if (!exists) {
      missingTables.push(model)
      continue
    }
    const pgCols = await fetchPostgresColumns(client, model)
    const pgNames = new Set(pgCols.map((c) => c.name))
    for (const field of fields) {
      if (!pgNames.has(field)) missingColumns.push(`${model}.${field}`)
    }
  }

  return {
    ok: missingTables.length === 0 && missingColumns.length === 0,
    missingTables,
    missingColumns,
    extraIssues,
  }
}

export function validateSqliteAgainstPrisma(sqlite, prismaModels) {
  const tables = sqliteTableNames(sqlite)
  const tableSet = new Set(tables)
  const missingTables = []
  const missingColumns = []

  for (const [model, fields] of prismaModels) {
    if (!tableSet.has(model)) {
      missingTables.push(model)
      continue
    }
    const cols = new Set(listSqliteColumns(sqlite, model).map((c) => c.name))
    for (const field of fields) {
      if (!cols.has(field)) missingColumns.push(`${model}.${field}`)
    }
  }
  return { ok: missingTables.length === 0 && missingColumns.length === 0, missingTables, missingColumns }
}

export function detectSchemaDrift(sqlite, pgColumnMap) {
  const drift = []
  for (const table of sqliteTableNames(sqlite)) {
    const sqliteCols = listSqliteColumns(sqlite, table)
    const pgCols = pgColumnMap.get(table)
    if (!pgCols) {
      drift.push({ table, issue: 'missing_postgres_table' })
      continue
    }
    const pgNames = new Set(pgCols.map((c) => c.name))
    for (const col of sqliteCols) {
      if (!pgNames.has(col.name)) drift.push({ table, column: col.name, issue: 'missing_postgres_column' })
    }
  }
  return drift
}

const EPOCH_MS_MIN = 946684800000 // 2000-01-01
const EPOCH_MS_MAX = 4102444800000 // 2100-01-01

export function normalizeCellValue(value, sqliteType = '') {
  if (value === null || value === undefined) return null
  const upper = sqliteType.toUpperCase()
  if (typeof value === 'boolean') return value
  if (typeof value === 'bigint') {
    const n = Number(value)
    if (n >= EPOCH_MS_MIN && n <= EPOCH_MS_MAX) return new Date(n).toISOString()
    return n
  }
  if (typeof value === 'number') {
    if (upper.includes('BOOL')) return value !== 0
    if (value >= EPOCH_MS_MIN && value <= EPOCH_MS_MAX && (upper.includes('DATE') || upper.includes('TIME')))
      return new Date(value).toISOString()
    return value
  }
  return value
}

export async function findOccupiedTables(client, tableNames) {
  const occupied = []
  for (const table of tableNames) {
    const count = await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`)
    if (count.rows[0].count > 0) occupied.push({ table, count: count.rows[0].count })
  }
  return occupied
}

/**
 * Core migration (caller provides connected pg client + sqlite DatabaseSync).
 */
export async function migrateSqliteToPostgres({
  sqlite,
  client,
  prismaModels,
  onProgress,
}) {
  const tables = sqliteTableNames(sqlite)
  const { ordered, cycles } = buildTableInsertOrder(sqlite, tables)

  const sqliteSchema = validateSqliteAgainstPrisma(sqlite, prismaModels)
  if (!sqliteSchema.ok) {
    throw new Error(
      `SQLite schema drift vs Prisma: tables=${sqliteSchema.missingTables.join(',')}; cols=${sqliteSchema.missingColumns.join(',')}`,
    )
  }

  const pgSchema = await validatePostgresAgainstPrisma(client, prismaModels)
  if (!pgSchema.ok) {
    throw new Error(
      `Postgres schema drift vs Prisma: tables=${pgSchema.missingTables.join(',')}; cols=${pgSchema.missingColumns.join(',')}`,
    )
  }

  const pgColumnMap = new Map()
  for (const table of ordered) {
    pgColumnMap.set(table, await fetchPostgresColumns(client, table))
  }
  const drift = detectSchemaDrift(sqlite, pgColumnMap)
  if (drift.length) {
    throw new Error(`Schema drift detected (${drift.length} issues); first=${JSON.stringify(drift[0])}`)
  }

  const occupied = await findOccupiedTables(client, ordered)
  if (occupied.length) {
    return { status: 'refused_non_empty', occupied, cycles, ordered }
  }

  const report = { tables: [], cycles, ordered, status: 'committed' }
  let txOpen = false
  try {
    await client.query('BEGIN')
    txOpen = true
    for (const table of ordered) {
      const columns = listSqliteColumns(sqlite, table)
      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all()
      for (const row of rows) {
        const names = columns.map((c) => c.name)
        const values = names.map((name, i) => normalizeCellValue(row[name], columns[i].type))
        const placeholders = names.map((_, index) => `$${index + 1}`).join(', ')
        try {
          await client.query(
            `INSERT INTO "${table}" (${names.map((n) => `"${n}"`).join(', ')}) VALUES (${placeholders})`,
            values,
          )
        } catch (insertError) {
          const reason = insertError instanceof Error ? insertError.message : String(insertError)
          throw new Error(formatMigrationFailureReport({ failedTable: table, reason }))
        }
      }
      const targetCount = (await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`)).rows[0].count
      if (rows.length !== targetCount) {
        throw new Error(`Count mismatch for ${table}: sqlite ${rows.length}, postgres ${targetCount}`)
      }
      report.tables.push({ table, rows: rows.length })
      onProgress?.(table, rows.length)
    }
    await client.query('COMMIT')
    txOpen = false
    return report
  } catch (error) {
    if (txOpen) await client.query('ROLLBACK')
    throw error
  }
}

export function formatMigrationFailureReport({ failedTable, reason }) {
  return [
    'Migration report',
    '----------------',
    'status: failed',
    `failed_table: ${failedTable}`,
    `reason: ${reason}`,
  ].join('\n')
}

export function formatMigrationReport(report) {
  if (report.status === 'refused_non_empty') {
    return [
      'Migration refused: target PostgreSQL is not empty.',
      ...report.occupied.map((o) => `  ${o.table}: ${o.count} rows`),
    ].join('\n')
  }
  const lines = ['Migration report', '----------------', `status: ${report.status}`, `tables: ${report.tables.length}`]
  if (report.cycles?.length) lines.push(`fk_cycles (manual review): ${report.cycles.join(', ')}`)
  for (const t of report.tables) lines.push(`  ${t.table}: ${t.rows} rows`)
  const total = report.tables.reduce((s, t) => s + t.rows, 0)
  lines.push(`total_rows: ${total}`)
  return lines.join('\n')
}