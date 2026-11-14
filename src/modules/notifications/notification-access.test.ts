import test from 'node:test'
import assert from 'node:assert/strict'

/** Mirrors server rule: notification rows are scoped by customerId. */
export function canAccessNotification(notificationCustomerId: string, sessionCustomerId: string) {
  return notificationCustomerId === sessionCustomerId
}

test('notification access requires matching customer', () => {
  assert.equal(canAccessNotification('a', 'a'), true)
  assert.equal(canAccessNotification('a', 'b'), false)
})