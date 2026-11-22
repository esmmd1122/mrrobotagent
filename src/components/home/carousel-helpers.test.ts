import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeActiveCarouselIndex,
  computeCarouselNavBounds,
  computeCarouselStep,
  resolveCarouselScrollDelta,
} from './carousel-helpers'

test('computeCarouselStep uses card width + gap when available and safe fallback otherwise', () => {
  assert.equal(computeCarouselStep(390, 310, 14), 324)
  assert.equal(computeCarouselStep(390, null, 14), Math.round(390 * 0.82))
  assert.equal(computeCarouselStep(200, null, 14), 220)
})

test('resolveCarouselScrollDelta respects RTL and LTR reading directions', () => {
  // In Persian RTL, next moves leftward (-X) and prev moves rightward (+X)
  assert.equal(resolveCarouselScrollDelta('next', 320, true), -320)
  assert.equal(resolveCarouselScrollDelta('prev', 320, true), 320)

  // In LTR, next moves rightward (+X) and prev moves leftward (-X)
  assert.equal(resolveCarouselScrollDelta('next', 320, false), 320)
  assert.equal(resolveCarouselScrollDelta('prev', 320, false), -320)
})

test('computeCarouselNavBounds handles negative RTL scrollLeft cleanly', () => {
  // Start of RTL track
  assert.deepEqual(computeCarouselNavBounds(0, 1200, 400), {
    canPrev: false,
    canNext: true,
  })
  // Middle of RTL track (negative scrollLeft in modern browsers)
  assert.deepEqual(computeCarouselNavBounds(-360, 1200, 400), {
    canPrev: true,
    canNext: true,
  })
  // End of RTL track
  assert.deepEqual(computeCarouselNavBounds(-796, 1200, 400), {
    canPrev: true,
    canNext: false,
  })
  // Non-overflowing track
  assert.deepEqual(computeCarouselNavBounds(0, 380, 400), {
    canPrev: false,
    canNext: false,
  })
})

test('computeActiveCarouselIndex clamps cleanly across first, middle, and last items', () => {
  assert.equal(computeActiveCarouselIndex(0, 1300, 390, 320, 4), 0)
  assert.equal(computeActiveCarouselIndex(-325, 1300, 390, 320, 4), 1)
  assert.equal(computeActiveCarouselIndex(-640, 1300, 390, 320, 4), 2)
  assert.equal(computeActiveCarouselIndex(-908, 1300, 390, 320, 4), 3)
  assert.equal(computeActiveCarouselIndex(0, 390, 390, 320, 1), 0)
})
