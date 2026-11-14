import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePrivateS3Key } from './storage-path.ts'

test('parsePrivateS3Key extracts object key', () => {
  assert.equal(parsePrivateS3Key('private:s3:fulfillment/o1/a.pdf'), 'fulfillment/o1/a.pdf')
  assert.equal(parsePrivateS3Key('private:s3:/fulfillment/o1/a.pdf'), 'fulfillment/o1/a.pdf')
  assert.equal(parsePrivateS3Key('private:quarantine/uploads/x'), null)
})

test('public HTTP URLs are not accepted as s3 private keys', () => {
  assert.equal(parsePrivateS3Key('https://bucket.example.com/key'), null)
})