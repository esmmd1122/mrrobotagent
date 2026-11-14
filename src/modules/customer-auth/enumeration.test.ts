import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CUSTOMER_LOGIN_GENERIC_ERROR,
  CUSTOMER_REGISTER_GENERIC_ERROR,
} from '../../lib/customer-auth/constants.ts'

test('auth failure messages do not reveal account existence', () => {
  for (const msg of [CUSTOMER_LOGIN_GENERIC_ERROR, CUSTOMER_REGISTER_GENERIC_ERROR]) {
    assert.doesNotMatch(msg.toLowerCase(), /exist|موجود|یافت شد|duplicate|registered already/)
  }
})