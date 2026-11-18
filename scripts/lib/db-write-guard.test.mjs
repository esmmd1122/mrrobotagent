import test from 'node:test'
import assert from 'node:assert/strict'
import { assertDbWriteAllowed, describePostgresTarget } from './db-write-guard.mjs'

test('refuses writes without confirmation', () => {
  assert.throws(() => assertDbWriteAllowed({}, []), /Refusing to write/)
})

test('allows writes with env confirmation', () => {
  assertDbWriteAllowed({ MR_ROBOT_CONFIRM_DB_WRITE: '1' }, [])
})

test('describePostgresTarget omits secrets', () => {
  const info = describePostgresTarget('postgresql://user:secret@ep-foo.region.neon.tech/neondb?sslmode=require')
  assert.equal(info.host, 'ep-foo.region.neon.tech')
  assert.equal(info.database, 'neondb')
  assert.equal(info.user, 'user')
  assert.doesNotMatch(JSON.stringify(info), /secret/)
})