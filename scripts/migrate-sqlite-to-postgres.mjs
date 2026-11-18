import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import { assertDbWriteAllowed, describePostgresTarget } from './lib/db-write-guard.mjs'
import { loadPrismaModels } from './lib/parse-prisma-schema.mjs'
import { formatMigrationReport, migrateSqliteToPostgres } from './lib/pg-migrate-core.mjs'

try {
  assertDbWriteAllowed()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(2)
}

const postgresUrl = process.env.POSTGRES_URL
if (!postgresUrl) {
  console.error('POSTGRES_URL is not set. No data was copied.')
  process.exit(2)
}

const target = describePostgresTarget(postgresUrl)
console.log('Target PostgreSQL identity:')
console.log(`  host: ${target.host}`)
console.log(`  database: ${target.database}`)
console.log(`  user: ${target.user}`)
console.log(`  ssl: ${target.ssl}`)

const prismaModels = loadPrismaModels(path.join('prisma', 'schema.prisma'))
const sqlite = new DatabaseSync(path.join('prisma', 'dev.db'))
const { default: pg } = await import('pg')
const client = new pg.Client({ connectionString: postgresUrl })

await client.connect()
try {
  const report = await migrateSqliteToPostgres({
    sqlite,
    client,
    prismaModels,
    onProgress(table, rows) {
      console.log(`${table}: ${rows}`)
    },
  })

  if (report.status === 'refused_non_empty') {
    console.error(formatMigrationReport(report))
    process.exit(3)
  }

  console.log(formatMigrationReport(report))
  console.log('Migration committed. SQLite file was not modified.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Migration failed and was rolled back.')
  process.exit(1)
} finally {
  await client.end()
  sqlite.close()
}