import assert from 'node:assert/strict'
import test from 'node:test'
import { devRevealAllowed, rateLimit } from './otp-policy.ts'
import {
  advanceAllowed,
  cancellationAllowed,
  employeeWindow,
  calendarColumnCount,
  rangesOverlap,
  resolveOpenWindow,
  slotsForDay,
  tehranLocalToUtc,
  withinHorizon,
} from './scheduling.ts'

test('overlapping ranges block each other', () => {
  assert.equal(rangesOverlap(60, 90, 90, 120), false)
  assert.equal(rangesOverlap(60, 91, 90, 120), true)
})

test('slots skip busy intervals and fit duration', () => {
  const slots = slotsForDay({
    openMin: 600,
    closeMin: 720,
    duration: 60,
    step: 30,
    busy: [{ startMin: 660, endMin: 720 }],
  })
  assert.deepEqual(slots, [600])
})

test('holiday and closed exception remove the working window', () => {
  assert.equal(
    resolveOpenWindow({
      weekly: { closed: false, startTime: '10:00', endTime: '20:00' },
      exception: { closed: true, startTime: '10:00', endTime: '20:00' },
    }),
    null,
  )
})

test('exceptional hours replace the weekly window', () => {
  const window = resolveOpenWindow({
    weekly: { closed: true, startTime: '10:00', endTime: '20:00' },
    exception: { closed: false, startTime: '12:00', endTime: '16:00' },
  })
  assert.deepEqual(window, { openMin: 720, closeMin: 960 })
})

test('employee without that weekday can work during an open exception', () => {
  const window = employeeWindow({ openMin: 720, closeMin: 960 }, null, true)
  assert.deepEqual(window, { openMin: 720, closeMin: 960 })
})

test('weekly break removes slots inside the break', () => {
  const slots = slotsForDay({
    openMin: 600,
    closeMin: 780,
    duration: 60,
    step: 60,
    busy: [{ startMin: 660, endMin: 720 }],
  })
  assert.deepEqual(slots, [600, 720])
})

test('minimum advance and horizon reject early or far dates', () => {
  const now = new Date('2026-11-12T08:00:00.000Z')
  const tooSoon = tehranLocalToUtc('2026-11-12', 12 * 60)
  assert.equal(advanceAllowed(tooSoon, now, 180), false)
  assert.equal(withinHorizon('2026-11-20', '2026-11-12', 5), false)
  assert.equal(withinHorizon('2026-11-14', '2026-11-12', 5), true)
})

test('cancellation deadline is enforced by time remaining', () => {
  const start = new Date('2026-11-12T12:00:00.000Z')
  const now = new Date('2026-11-12T11:00:00.000Z')
  assert.equal(cancellationAllowed(start, now, 2), false)
  assert.equal(cancellationAllowed(start, new Date('2026-11-12T08:00:00.000Z'), 2), true)
})

test('full-day leave is represented by skipping the employee window', () => {
  assert.equal(employeeWindow({ openMin: 600, closeMin: 1200 }, null, false), null)
})

test('development OTP reveal stays off in production', () => {
  assert.equal(devRevealAllowed({ NODE_ENV: 'production', OTP_DEV_REVEAL: 'true' }), false)
  assert.equal(
    devRevealAllowed({ NODE_ENV: 'development', VERCEL_ENV: 'production', OTP_DEV_REVEAL: 'true' }),
    false,
  )
  assert.equal(devRevealAllowed({ NODE_ENV: 'development', OTP_DEV_REVEAL: 'true' }), true)
})

test('OTP requests are rate limited', () => {
  const key = `otp-test-${Date.now()}`
  assert.equal(rateLimit(key, 2, 60_000, 1_000), true)
  assert.equal(rateLimit(key, 2, 60_000, 1_001), true)
  assert.equal(rateLimit(key, 2, 60_000, 1_002), false)
})

test('calendar columns stay single on day view and tighten on narrow screens', () => {
  assert.equal(calendarColumnCount('day', 390), 1)
  assert.equal(calendarColumnCount('day', 1440), 1)
  assert.equal(calendarColumnCount('week', 390), 2)
  assert.equal(calendarColumnCount('month', 800), 4)
  assert.equal(calendarColumnCount('month', 1280), 7)
})

test('no slot when duration does not fit', () => {
  const slots = slotsForDay({
    openMin: 600,
    closeMin: 650,
    duration: 60,
    step: 30,
    busy: [],
  })
  assert.deepEqual(slots, [])
})
