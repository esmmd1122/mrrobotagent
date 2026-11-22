import test from 'node:test'
import assert from 'node:assert/strict'
import { STORY_KEYFRAMES, evaluateStoryFrame, lerpPose } from './keyframes'

test('STORY_KEYFRAMES preserves all 8 RTL scenes', () => {
  assert.equal(STORY_KEYFRAMES.length, 8)
  // Desktop Hero keeps MR.ROBOT on left (-X) for RTL right-hand copy
  assert.ok(STORY_KEYFRAMES[0].charPos[0] < -1.0)
  // Marketplace suppresses background sculpture so dedicated ProductShowcaseCanvas owns product display
  assert.ok(STORY_KEYFRAMES[3].stageScale < 0.01)
})

test('evaluateStoryFrame preserves exact desktop framing at 1440px', () => {
  const hero = evaluateStoryFrame(0, 1440)
  assert.deepEqual(hero.cam, STORY_KEYFRAMES[0].cam)
  assert.deepEqual(hero.look, STORY_KEYFRAMES[0].look)
  assert.deepEqual(hero.charPos, STORY_KEYFRAMES[0].charPos)
  assert.equal(hero.fov, 38)

  const finale = evaluateStoryFrame(99, 1440)
  assert.deepEqual(finale.cam, STORY_KEYFRAMES[7].cam)
  assert.equal(finale.pose.eyeGlow, 4.5)
})

test('evaluateStoryFrame adapts safely for mobile viewports (320px-430px)', () => {
  const mobileHero = evaluateStoryFrame(0, 390)
  const desktopHero = evaluateStoryFrame(0, 1440)

  // Character centers horizontally on narrow mobile screens
  assert.ok(Math.abs(mobileHero.charPos[0]) < 0.25)
  // Camera pulls back and lowers look target so character frames cleanly in upper hero viewport
  assert.ok(mobileHero.cam[2] > desktopHero.cam[2] + 1.0)
  assert.ok(mobileHero.look[1] < desktopHero.look[1] - 0.3)

  // Mobile marketplace keeps center stage target aligned
  const mobileMarket = evaluateStoryFrame(3, 320)
  assert.equal(mobileMarket.stagePos[0], 0)
  assert.ok(mobileMarket.stageScale < 0.01)
})

test('lerpPose interpolates smoothly without NaN', () => {
  const mid = lerpPose(STORY_KEYFRAMES[0].pose, STORY_KEYFRAMES[4].pose, 0.5)
  assert.equal(mid.eyeGlow, (STORY_KEYFRAMES[0].pose.eyeGlow + STORY_KEYFRAMES[4].pose.eyeGlow) / 2)
  assert.equal(mid.orbPos.length, 3)
  assert.ok(mid.orbPos.every((v) => Number.isFinite(v)))
})
