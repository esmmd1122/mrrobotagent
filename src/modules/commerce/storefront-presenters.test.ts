import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductFaqItems,
  computeCartSavings,
  filterShopCategories,
} from './storefront-presenters'

test('computeCartSavings calculates total promo savings across cart lines', () => {
  const savings = computeCartSavings([
    { listUnitPrice: 450000, unitPrice: 360000, quantity: 2 },
    { listUnitPrice: 200000, unitPrice: 200000, quantity: 1 },
    { listUnitPrice: 100000, unitPrice: 120000, quantity: 1 },
  ])
  assert.equal(savings, 180000)
})

test('filterShopCategories filters by category slug, query text, and purchasable flag', () => {
  const categories = [
    {
      id: 'c1',
      slug: 'ai',
      nameFa: 'هوش مصنوعی',
      nameEn: 'AI',
      products: [
        {
          id: 'p1',
          slug: 'chatgpt-plus',
          nameFa: 'اشتراک ChatGPT Plus',
          nameEn: 'ChatGPT Plus',
          description: 'دستیار هوش مصنوعی',
          purchasable: true,
        },
        {
          id: 'p2',
          slug: 'grok',
          nameFa: 'اشتراک Grok',
          nameEn: 'Grok',
          description: 'سرویس استعلامی',
          purchasable: false,
        },
      ],
    },
    {
      id: 'c2',
      slug: 'video',
      nameFa: 'ویرایش ویدیو',
      nameEn: 'Video',
      products: [
        {
          id: 'p3',
          slug: 'capcut-pro',
          nameFa: 'CapCut Pro',
          nameEn: 'CapCut Pro',
          description: 'تدوین حرفه‌ای',
          purchasable: true,
        },
      ],
    },
  ]

  const byQuery = filterShopCategories(categories, { query: 'chatgpt' })
  assert.equal(byQuery.length, 1)
  assert.equal(byQuery[0].products.length, 1)
  assert.equal(byQuery[0].products[0].slug, 'chatgpt-plus')

  const onlyBuyable = filterShopCategories(categories, {
    categorySlug: 'ai',
    onlyPurchasable: true,
  })
  assert.equal(onlyBuyable.length, 1)
  assert.equal(onlyBuyable[0].products.length, 1)
  assert.equal(onlyBuyable[0].products[0].slug, 'chatgpt-plus')
})

test('buildProductFaqItems reflects real plan instructions and support hours without inventing claims', () => {
  const faqs = buildProductFaqItems({
    productName: 'ChatGPT Plus',
    categoryName: 'هوش مصنوعی',
    hasMultiplePlans: true,
    planInstructions: ['ارسال اطلاعات فعال‌سازی پس از تایید'],
    supportHours: '۹ تا ۲۱',
  })

  assert.equal(faqs.length, 5)
  assert.ok(faqs.some((f) => f.id === 'plan-choice'))
  const deliveryFaq = faqs.find((f) => f.id === 'delivery-activation')
  assert.ok(deliveryFaq?.answer.includes('ارسال اطلاعات فعال‌سازی پس از تایید'))
  const supportFaq = faqs.find((f) => f.id === 'support')
  assert.ok(supportFaq?.answer.includes('۹ تا ۲۱'))
})
