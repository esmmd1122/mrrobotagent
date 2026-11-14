import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseProductPurchaseFields,
  validatePurchaseFieldAnswers,
  formatPurchaseInfoForAdmin,
} from './purchase-fields.ts'

test('parses purchase field definitions', () => {
  const defs = parseProductPurchaseFields(
    '[{"id":"tid","label":"آیدی","type":"text","required":true}]',
  )
  assert.equal(defs.length, 1)
  assert.equal(defs[0].id, 'tid')
})

test('validates required product-specific fields', () => {
  const defs = parseProductPurchaseFields(
    '[{"id":"email_account","label":"ایمیل اکانت","type":"email","required":true}]',
  )
  const fd = new FormData()
  const missing = validatePurchaseFieldAnswers(defs, fd)
  assert.equal(missing.ok, false)

  fd.set('pf_email_account', 'not-an-email')
  const bad = validatePurchaseFieldAnswers(defs, fd)
  assert.equal(bad.ok, false)

  fd.set('pf_email_account', 'user@example.com')
  const ok = validatePurchaseFieldAnswers(defs, fd)
  assert.equal(ok.ok, true)
  assert.ok(ok.ok && ok.deliveryInfo.includes('customer_purchase_info'))
})

test('formatPurchaseInfoForAdmin renders labels', () => {
  const raw = JSON.stringify({
    kind: 'customer_purchase_info',
    fields: [{ id: 'x', label: 'شناسه', value: 'abc' }],
  })
  assert.match(formatPurchaseInfoForAdmin(raw)!, /شناسه: abc/)
})