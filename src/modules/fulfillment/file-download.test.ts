import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'crypto'
import { hashOrderViewToken } from '../commerce/view-token.ts'
import {
  createFileDownloadGrant,
  verifyFileDownloadGrant,
  createFileDownloadGrantForCustomer,
  verifyCustomerSessionFileGrant,
} from './file-download-grant.ts'

test('download grant verifies for matching owner token', () => {
  process.env.AUTH_SECRET = 'z'.repeat(32)
  const viewToken = 'customer-secret-token'
  const grant = createFileDownloadGrant('file-1', 'MR-123', viewToken)
  assert.equal(verifyFileDownloadGrant('file-1', 'MR-123', viewToken, grant.exp, grant.sig), true)
  assert.equal(verifyFileDownloadGrant('file-1', 'MR-123', 'other', grant.exp, grant.sig), false)
  assert.equal(verifyFileDownloadGrant('file-2', 'MR-123', viewToken, grant.exp, grant.sig), false)
})

test('expired download grant is rejected', () => {
  process.env.AUTH_SECRET = 'z'.repeat(32)
  const exp = Date.now() - 1000
  const viewToken = 't'
  const owner = hashOrderViewToken(viewToken)
  const sig = createHmac('sha256', process.env.AUTH_SECRET)
    .update(`vt:file-1:MR-1:${owner}:${exp}`)
    .digest('base64url')
  assert.equal(verifyFileDownloadGrant('file-1', 'MR-1', viewToken, exp, sig), false)
})

test('session file grant binds to customer id', () => {
  process.env.AUTH_SECRET = 'z'.repeat(32)
  const grant = createFileDownloadGrantForCustomer('f1', 'MR-9', 'cust-abc')
  assert.equal(verifyCustomerSessionFileGrant('f1', 'MR-9', 'cust-abc', grant.exp, grant.sig), true)
  assert.equal(verifyCustomerSessionFileGrant('f1', 'MR-9', 'other', grant.exp, grant.sig), false)
})