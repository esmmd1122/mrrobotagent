import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import { backupSqliteDatabase } from './sqlite-backup-core.mjs'

test('WAL mode backup preserves data and passes integrity_check', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-bak-'))
  const src = path.join(dir, 'src.db')
  const bak = path.join(dir, 'bak.db')
  const db = new DatabaseSync(src)
  db.exec('PRAGMA journal_mode=WAL')
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)')
  db.exec("INSERT INTO t VALUES (1, 'ok')")
  db.close()

  const report = backupSqliteDatabase(src, bak)
  assert.equal(report.backupIntegrity, 'ok')
  assert.ok(report.backupSizeBytes > 0)

  const read = new DatabaseSync(bak, { readOnly: true })
  assert.equal(read.prepare('SELECT v FROM t WHERE id=1').get().v, 'ok')
  read.close()
})