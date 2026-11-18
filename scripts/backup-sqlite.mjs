import { mkdir } from 'fs/promises'
import path from 'path'
import { assertDbWriteAllowed } from './lib/db-write-guard.mjs'
import { backupSqliteDatabase } from './lib/sqlite-backup-core.mjs'

try {
  assertDbWriteAllowed()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(2)
}

const source = path.join('prisma', 'dev.db')
const dir = path.join('prisma', 'backups')
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const target = path.join(dir, `dev-${stamp}.db`)

await mkdir(dir, { recursive: true })

try {
  const report = backupSqliteDatabase(source, target)
  console.log('SQLite backup complete')
  console.log(`  target: ${report.targetPath}`)
  console.log(`  source_size_bytes: ${report.sourceSizeBytes}`)
  console.log(`  backup_size_bytes: ${report.backupSizeBytes}`)
  console.log(`  source_integrity: ${report.sourceIntegrity}`)
  console.log(`  backup_integrity: ${report.backupIntegrity}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Backup failed')
  process.exit(1)
}