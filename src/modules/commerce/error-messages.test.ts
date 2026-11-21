import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeDigits,
  normalizePhoneInput,
  resolveStorefrontErrorMessage,
  safeDecodeParam,
  validateCheckoutContact,
} from './error-messages.ts'

test('safeDecodeParam decodes valid strings and survives malformed % sequences', () => {
  assert.equal(safeDecodeParam(encodeURIComponent('سبد خرید خالی است.')), 'سبد خرید خالی است.')
  assert.equal(safeDecodeParam('%E0%A4%A'), '%E0%A4%A')
  assert.equal(safeDecodeParam(undefined), '')
})

test('resolveStorefrontErrorMessage maps raw English codes to Persian messages', () => {
  const msg = resolveStorefrontErrorMessage('invalid')
  assert.ok(msg && msg !== 'invalid' && /نام|تماس|قوانین/.test(msg))
  assert.ok(resolveStorefrontErrorMessage('invalid_plan')?.includes('طرح'))
  assert.ok(resolveStorefrontErrorMessage('select_plan')?.includes('طرح'))
  assert.equal(resolveStorefrontErrorMessage(encodeURIComponent('کد تخفیف منقضی شده.')), 'کد تخفیف منقضی شده.')
})

test('normalizeDigits and normalizePhoneInput convert Persian/Arabic numerals', () => {
  assert.equal(normalizeDigits('۰۹۱۲-۳۴۵۶۷۸۹'), '0912-3456789')
  assert.equal(normalizePhoneInput('۰۹۱۲ ۳۴۵-۶۷۸۹'), '09123456789')
})

test('validateCheckoutContact enforces name, at least email or phone, and terms', () => {
  const missingContact = validateCheckoutContact({
    name: 'علی رضایی',
    email: '',
    phone: '',
    termsAccepted: true,
  })
  assert.equal(missingContact.ok, false)

  const validPersianPhone = validateCheckoutContact({
    name: 'علی رضایی',
    email: '',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    termsAccepted: true,
  })
  assert.equal(validPersianPhone.ok, true)
  if (validPersianPhone.ok) {
    assert.equal(validPersianPhone.phone, '09123456789')
  }

  const missingTerms = validateCheckoutContact({
    name: 'علی رضایی',
    email: 'ali@example.com',
    phone: '',
    termsAccepted: false,
  })
  assert.equal(missingTerms.ok, false)

  const sessionFallbackEmail = validateCheckoutContact({
    name: 'علی رضایی',
    email: '',
    phone: '',
    termsAccepted: true,
    fallbackEmail: 'ali@example.com',
  })
  assert.equal(sessionFallbackEmail.ok, true)
})
