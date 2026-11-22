import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isNextImageCompatibleSrc,
  OFFICIAL_MASCOT_AVATAR_FALLBACK,
  OFFICIAL_MASCOT_AVATAR_PRIMARY,
  resolveNextMascotAvatarSrc,
  resolveSafeSectionImageUrl,
} from './mascot-media'

test('official mascot avatar fallback chain steps through permanent local assets cleanly', () => {
  assert.equal(OFFICIAL_MASCOT_AVATAR_PRIMARY, '/images/mr-robot-character.png')
  assert.equal(OFFICIAL_MASCOT_AVATAR_FALLBACK, '/images/mr-robot-cinematic.jpg')
  assert.equal(
    resolveNextMascotAvatarSrc(OFFICIAL_MASCOT_AVATAR_PRIMARY),
    OFFICIAL_MASCOT_AVATAR_FALLBACK,
  )
  assert.equal(resolveNextMascotAvatarSrc(OFFICIAL_MASCOT_AVATAR_FALLBACK), null)
  assert.equal(resolveNextMascotAvatarSrc('/broken/custom.png'), OFFICIAL_MASCOT_AVATAR_PRIMARY)
})

test('resolveSafeSectionImageUrl accepts Cloudinary, HTTPS, and safe local paths', () => {
  assert.equal(
    resolveSafeSectionImageUrl(
      'https://res.cloudinary.com/k6sw7yrg/image/upload/v1732205717/mr-robot/sections/hero.webp',
    ),
    'https://res.cloudinary.com/k6sw7yrg/image/upload/v1732205717/mr-robot/sections/hero.webp',
  )
  assert.equal(resolveSafeSectionImageUrl('/uploads/sections/demo.png'), '/uploads/sections/demo.png')
  assert.equal(resolveSafeSectionImageUrl('/images/mr-robot-character.png'), '/images/mr-robot-character.png')
  assert.equal(resolveSafeSectionImageUrl(''), null)
  assert.equal(resolveSafeSectionImageUrl('   '), null)
})

test('resolveSafeSectionImageUrl blocks unsafe schemes, traversal, and ephemeral attachment paths', () => {
  assert.equal(resolveSafeSectionImageUrl('javascript:alert(1)'), null)
  assert.equal(resolveSafeSectionImageUrl('data:image/svg+xml,<svg/>'), null)
  assert.equal(resolveSafeSectionImageUrl('//evil.example/img.png'), null)
  assert.equal(resolveSafeSectionImageUrl('/uploads/../secret.png'), null)
  assert.equal(resolveSafeSectionImageUrl('/assets/aistudio/IMG_0544_1313509c.JPG'), null)
})

test('isNextImageCompatibleSrc identifies local and Cloudinary URLs safely', () => {
  assert.equal(isNextImageCompatibleSrc('/images/mr-robot-character.png'), true)
  assert.equal(
    isNextImageCompatibleSrc('https://res.cloudinary.com/k6sw7yrg/image/upload/v1/sections/a.jpg'),
    true,
  )
  assert.equal(isNextImageCompatibleSrc('https://cdn.example.com/custom.png'), false)
  assert.equal(isNextImageCompatibleSrc('http://res.cloudinary.com/k6sw7yrg/a.jpg'), false)
})
