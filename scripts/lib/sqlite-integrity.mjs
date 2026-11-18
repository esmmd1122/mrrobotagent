import { DatabaseSync } from 'node:sqlite'

export function sqliteIntegrityCheck(dbPath, { readOnly = true } = {}) {
  const db = new DatabaseSync(dbPath, readOnly ? { readOnly: true } : undefined)
  try {
    const row = db.prepare('PRAGMA integrity_check').get()
    const result = row?.integrity_check ?? row?.['integrity_check'] ?? Object.values(row ?? {})[0]
    return { ok: result === 'ok', result: String(result ?? '') }
  } finally {
    db.close()
  }
}