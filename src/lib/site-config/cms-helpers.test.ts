import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateDiscountPercent,
  getSectionConfig,
  normalizeSections,
  normalizeWebsiteConfig,
  safeCmsHref,
} from './cms-helpers.ts'
import { DEFAULT_WEBSITE_CONFIG } from './defaults.ts'

test('safeCmsHref blocks javascript: and data: schemes while preserving safe internal and external URLs', () => {
  assert.equal(safeCmsHref('#marketplace'), '#marketplace')
  assert.equal(safeCmsHref('/shop'), '/shop')
  assert.equal(safeCmsHref('https://t.me/mrrobot'), 'https://t.me/mrrobot')
  assert.equal(safeCmsHref('javascript:alert(1)', '/'), '/')
  assert.equal(safeCmsHref('data:text/html,<script>', '/shop'), '/shop')
  assert.equal(safeCmsHref('//evil.example', '/'), '/')
})

test('normalizeSections upgrades legacy 3-section configs while preserving saved visibility and titles', () => {
  const legacy = [
    { id: 'subscriptions' as const, enabled: false, sortOrder: 1, title: 'عنوان سفارشی فروشگاه' },
    { id: 'ai' as const, enabled: true, sortOrder: 2, title: 'بخش هوش مصنوعی' },
    { id: 'other' as const, enabled: true, sortOrder: 3 },
  ]
  const upgraded = normalizeSections(legacy)
  assert.equal(upgraded.length, 7)

  const subs = upgraded.find((s) => s.id === 'subscriptions')
  assert.equal(subs?.enabled, false)
  assert.equal(subs?.title, 'عنوان سفارشی فروشگاه')

  const intro = upgraded.find((s) => s.id === 'intro')
  assert.equal(intro?.enabled, true)
})

test('normalizeWebsiteConfig sanitizes unsafe CTA and navigation links', () => {
  const config = normalizeWebsiteConfig({
    ...DEFAULT_WEBSITE_CONFIG,
    hero: {
      ...DEFAULT_WEBSITE_CONFIG.hero,
      ctaPrimary: { label: 'کلیک', href: 'javascript:alert(1)' },
    },
  })
  assert.equal(config.hero.ctaPrimary.href, '#marketplace')
  assert.equal(getSectionConfig(config, 'trust').enabled, true)
})

test('calculateDiscountPercent returns accurate percentage only when promoPrice < listPrice', () => {
  assert.equal(calculateDiscountPercent(1000000, 750000), 25)
  assert.equal(calculateDiscountPercent(1000000, 1000000), null)
  assert.equal(calculateDiscountPercent(null, 500000), null)
  assert.equal(calculateDiscountPercent(500000, 600000), null)
})
