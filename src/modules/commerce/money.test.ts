import test from 'node:test'
import assert from 'node:assert/strict'
import { formatStoreMoney, STORE_CURRENCY_CODE } from './money.ts'

test('store money uses Tomans without conversion', () => {
  assert.match(formatStoreMoney(125000, STORE_CURRENCY_CODE), /تومان/)
  assert.equal(formatStoreMoney(100, 'IRR'), `${new Intl.NumberFormat('fa-IR').format(100)} ریال`)
  assert.doesNotMatch(formatStoreMoney(10, STORE_CURRENCY_CODE), /ریال/)
})