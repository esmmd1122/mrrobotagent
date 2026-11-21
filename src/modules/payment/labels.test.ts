import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isSafePaymentRedirectUrl,
  paymentProviderLabelFa,
  paymentStatusLabelFa,
  paymentTxStatusLabelFa,
} from './labels.ts'

test('payment status labels map cleanly to Persian', () => {
  assert.equal(paymentStatusLabelFa('UNPAID'), 'پرداخت‌نشده')
  assert.equal(paymentStatusLabelFa('PAID'), 'پرداخت‌شده')
  assert.equal(paymentTxStatusLabelFa('VERIFIED'), 'تأییدشده')
  assert.equal(paymentProviderLabelFa('zarinpal'), 'زرین‌پال')
})

test('isSafePaymentRedirectUrl allows http(s) and relative paths but blocks dangerous schemes', () => {
  assert.equal(isSafePaymentRedirectUrl('https://www.zarinpal.com/pg/StartPay/123'), true)
  assert.equal(isSafePaymentRedirectUrl('http://localhost:3000/orders/pay?id=1'), true)
  assert.equal(isSafePaymentRedirectUrl('/orders/pay?id=1'), true)
  assert.equal(isSafePaymentRedirectUrl('javascript:alert(1)'), false)
  assert.equal(isSafePaymentRedirectUrl('data:text/html,hi'), false)
  assert.equal(isSafePaymentRedirectUrl('//evil.example/phish'), false)
  assert.equal(isSafePaymentRedirectUrl(''), false)
})
