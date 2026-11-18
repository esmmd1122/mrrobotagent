import path from 'path'
import { runSchemaParityCheck } from './lib/compare-prisma-schemas.mjs'

const result = runSchemaParityCheck({
  sqlitePath: path.join('prisma', 'schema.prisma'),
  postgresPath: path.join('prisma', 'schema.postgresql.prisma'),
})

if (!result.ok) {
  console.error('Prisma schema parity check failed.')
  console.error(`Models compared: ${result.modelCount}`)
  for (const line of result.errors) console.error(`  - ${line}`)
  process.exit(1)
}

console.log(`Prisma schema parity OK (${result.modelCount} models).`)
console.log('Intentional PostgreSQL-only differences:')
console.log(`  - ${result.intentionalDifferences.datasource}`)