import fs from 'fs'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import { sqliteIntegrityCheck } from './sqlite-integrity.mjs'

export function listSqliteUserTables(sqlite) {
  return sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name",
    )
    .all()
    .map((r) => r.name)
}

/**
 * WAL-safe logical backup via VACUUM INTO (does not delete or rewrite the source file).
 */
export function backupSqliteDatabase(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) throw new Error(`Source database not found: ${sourcePath}`)
  const before = sqliteIntegrityCheck(sourcePath)
  if (!before.ok) throw new Error(`Source integrity_check failed: ${before.result}`)

  const source = new DatabaseSync(sourcePath)
  try {
    const escaped = targetPath.replace(/\\/g, '/').replace(/'/g, "''")
    source.exec(`VACUUM INTO '${escaped}'`)
  } finally {
    source.close()
  }

  if (!fs.existsSync(targetPath)) throw new Error('Backup file was not created')
  const size = fs.statSync(targetPath).size
  if (size <= 0) throw new Error('Backup file is empty')

  const after = sqliteIntegrityCheck(targetPath)
  if (!after.ok) throw new Error(`Backup integrity_check failed: ${after.result}`)

  const sourceSize = fs.statSync(sourcePath).size
  return {
    sourcePath,
    targetPath,
    sourceIntegrity: before.result,
    backupIntegrity: after.result,
    sourceSizeBytes: sourceSize,
    backupSizeBytes: size,
  }
}