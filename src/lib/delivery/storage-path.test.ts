import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
import {
  resolvePrivateDeliveryPath,
  PRIVATE_DELIVERY_PREFIX,
  parsePrivateS3Key,
  resolveQuarantinedLegacyUploadPath,
} from './storage-path.ts'

test('private delivery URLs resolve under data/private', () => {
  const stored = `${PRIVATE_DELIVERY_PREFIX}fulfillment/order-1/file.pdf`
  const resolved = resolvePrivateDeliveryPath(stored)
  assert.ok(resolved)
  assert.match(resolved!, /data[\\/]private[\\/]fulfillment/)
})

test('public http URLs are not resolved as private paths', () => {
  assert.equal(resolvePrivateDeliveryPath('https://cdn.example.com/x'), null)
  assert.equal(resolvePrivateDeliveryPath('/uploads/legacy.pdf'), null)
  assert.equal(parsePrivateS3Key('private:s3:key/obj'), 'key/obj')
  assert.equal(resolvePrivateDeliveryPath('private:s3:key/obj'), null)
})

test('quarantined legacy upload path maps under data/private', () => {
  const p = resolveQuarantinedLegacyUploadPath('/uploads/fulfillment/o1/x.pdf')
  assert.ok(p)
  assert.match(p!, /quarantine[\\/]uploads[\\/]fulfillment/)
})