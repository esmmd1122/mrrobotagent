import assert from 'node:assert/strict'
import test from 'node:test'
import {
  linesToStringArray,
  MAX_PRODUCT_LIST_ITEM_LENGTH,
  MAX_PRODUCT_LIST_ITEMS,
  parseStringListJson,
  serializeLinesToJsonArray,
  stringListJsonToLines,
  validateProductStringListJson,
} from './product-list-fields.ts'
import { validateProductPurchaseFieldsJson } from '../modules/commerce/purchase-fields.ts'

test('linesToStringArray and serializeLinesToJsonArray trim lines, ignore empty lines, and handle empty input cleanly', () => {
  const rawInput = '  تحویل فوری دیجیتال  \n\n   \r\nپشتیبانی فعال‌سازی   \n  قابل استفاده روی موبایل و دسکتاپ\n\n'
  const items = linesToStringArray(rawInput)
  assert.deepEqual(items, [
    'تحویل فوری دیجیتال',
    'پشتیبانی فعال‌سازی',
    'قابل استفاده روی موبایل و دسکتاپ',
  ])

  const serialized = serializeLinesToJsonArray(rawInput)
  assert.equal(
    serialized,
    JSON.stringify([
      'تحویل فوری دیجیتال',
      'پشتیبانی فعال‌سازی',
      'قابل استفاده روی موبایل و دسکتاپ',
    ]),
  )

  assert.deepEqual(linesToStringArray('   \n\n  '), [])
  assert.equal(serializeLinesToJsonArray(''), '[]')
  assert.equal(serializeLinesToJsonArray('   \n\r\n '), '[]')
})

test('linesToStringArray stays backward compatible with pasted JSON string arrays and bracketed plain text', () => {
  assert.deepEqual(linesToStringArray('["مورد ۱", "  مورد ۲  ", ""]'), ['مورد ۱', 'مورد ۲'])
  assert.deepEqual(linesToStringArray('[نسخه رسمی] تحویل فوری\nپشتیبانی ۲۴ ساعته'), [
    '[نسخه رسمی] تحویل فوری',
    'پشتیبانی ۲۴ ساعته',
  ])
})

test('stringListJsonToLines and parseStringListJson load existing JSON arrays and legacy plain text cleanly', () => {
  const savedJson = JSON.stringify(['جزئیات اول', 'جزئیات دوم'])
  assert.equal(stringListJsonToLines(savedJson), 'جزئیات اول\nجزئیات دوم')
  assert.equal(stringListJsonToLines('[]'), '')
  assert.equal(stringListJsonToLines(null), '')

  // Legacy plain-text fallback
  assert.deepEqual(parseStringListJson('خط اول قدیمی\n\nخط دوم قدیمی'), [
    'خط اول قدیمی',
    'خط دوم قدیمی',
  ])
})

test('validateProductStringListJson strictly validates JSON arrays without bypassing security', () => {
  const valid = validateProductStringListJson(
    JSON.stringify(['  ویژگی ۱  ', '', 'ویژگی ۲']),
    'ویژگی‌ها و مزایا',
  )
  assert.equal(valid.ok, true)
  if (valid.ok) {
    assert.deepEqual(valid.items, ['ویژگی ۱', 'ویژگی ۲'])
    assert.equal(valid.json, JSON.stringify(['ویژگی ۱', 'ویژگی ۲']))
  }

  const empty = validateProductStringListJson('[]', 'جزئیات محصول')
  assert.equal(empty.ok, true)
  if (empty.ok) {
    assert.deepEqual(empty.items, [])
    assert.equal(empty.json, '[]')
  }

  // Reject malformed JSON, non-arrays, non-string items, oversized items/lists
  assert.equal(validateProductStringListJson('plain text not json', 'ویژگی‌ها و مزایا').ok, false)
  assert.equal(validateProductStringListJson('{"a": 1}', 'ویژگی‌ها و مزایا').ok, false)
  assert.equal(validateProductStringListJson('[123, true]', 'ویژگی‌ها و مزایا').ok, false)
  assert.equal(
    validateProductStringListJson(
      JSON.stringify(['x'.repeat(MAX_PRODUCT_LIST_ITEM_LENGTH + 1)]),
      'جزئیات محصول',
    ).ok,
    false,
  )
  assert.equal(
    validateProductStringListJson(
      JSON.stringify(Array.from({ length: MAX_PRODUCT_LIST_ITEMS + 1 }, (_, i) => `item ${i}`)),
      'جزئیات محصول',
    ).ok,
    false,
  )
})

test('validateProductPurchaseFieldsJson validates structured checkout fields strictly', () => {
  const empty = validateProductPurchaseFieldsJson('[]')
  assert.equal(empty.ok, true)

  const valid = validateProductPurchaseFieldsJson(
    JSON.stringify([
      { id: 'telegram_id', label: 'آیدی تلگرام', type: 'text', required: true },
      { id: 'account_email', label: 'ایمیل اکانت', type: 'email', required: false },
    ]),
  )
  assert.equal(valid.ok, true)
  if (valid.ok) {
    assert.equal(valid.fields.length, 2)
    assert.equal(valid.fields[0].id, 'telegram_id')
  }

  // Reject invalid JSON, invalid type, invalid id, duplicate ids
  assert.equal(validateProductPurchaseFieldsJson('not json').ok, false)
  assert.equal(
    validateProductPurchaseFieldsJson(
      JSON.stringify([{ id: 'bad id!', label: 'تست', type: 'text' }]),
    ).ok,
    false,
  )
  assert.equal(
    validateProductPurchaseFieldsJson(
      JSON.stringify([{ id: 'x', label: 'تست', type: 'password' }]),
    ).ok,
    false,
  )
  assert.equal(
    validateProductPurchaseFieldsJson(
      JSON.stringify([
        { id: 'dup', label: 'اول', type: 'text' },
        { id: 'DUP', label: 'دوم', type: 'text' },
      ]),
    ).ok,
    false,
  )
})
