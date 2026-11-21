import test from 'node:test'
import assert from 'node:assert/strict'
import { STORY_KEYFRAMES, evaluateStoryFrame, lerpPose } from './keyframes'

test('STORY_KEYFRAMES preserves all 8 RTL scenes', () => {
  assert.equal(STORY_KEYFRAMES.length, 8)
  // Desktop Hero keeps MR.ROBOT on left (-X) for RTL right-hand copy
  assert.ok(STORY_KEYFRAMES[0].charPos[0] < -1.0)
  // Marketplace enables 3D product stage
  assert.equal(STORY_KEYFRAMES[3].stageScale, 1.0)
})

test('evaluateStoryFrame preserves exact desktop framing at 1440px', () => {
  const hero = evaluateStoryFrame(0, 1440)
  assert.deepEqual(hero.cam, [0.15, 1.3, 5.95])
  assert.deepEqual(hero.look, [-0.28, 1.02, 0])
  assert.deepEqual(hero.charPos, [-1.42, -0.08, 0.25])
  assert.equal(hero.fov, 38)

  const finale = evaluateStoryFrame(99, 1440)
  assert.deepEqual(finale.cam, STORY_KEYFRAMES[7].cam)
  assert.equal(finale.pose.eyeGlow, 4.5)
})

test('evaluateStoryFrame adapts safely for mobile viewports (320px-390px)', () => {
  const mobileHero = evaluateStoryFrame(0, 390)
  const desktopHero = evaluateStoryFrame(0, 1440)

  // Character centers horizontally on narrow mobile screens
  assert.ok(Math.abs(mobileHero.charPos[0]) < 0.25)
  // Camera pulls back and lowers look target so character frames cleanly in upper hero viewport
  assert.ok(mobileHero.cam[2] > desktopHero.cam[2] + 1.0)
  assert.ok(mobileHero.look[1] < desktopHero.look[1] - 0.3)

  // Mobile marketplace scales 3D stage cleanly to center
  const mobileMarket = evaluateStoryFrame(3, 320)
  assert.equal(mobileMarket.stagePos[0], 0)
  assert.ok(mobileMarket.stageScale > 0.7 && mobileMarket.stageScale < 0.8)
})

test('lerpPose interpolates smoothly without NaN', () => {
  const mid = lerpPose(STORY_KEYFRAMES[0].pose, STORY_KEYFRAMES[4].pose, 0.5)
  assert.equal(mid.eyeGlow, (3.5 + 4.3) / 2)
  assert.equal(mid.orbPos.length, 3)
  assert.ok(mid.orbPos.every((v) => Number.isFinite(v)))
})
