import { test, expect } from '@playwright/test'

/**
 * Full store checkout E2E requires catalog seed + sandbox env and must not invent orders in CI.
 * Run manually after `prisma db seed` with ALLOW_PAYMENT_SANDBOX=true on port 3111.
 */
test.describe('Store production flow', () => {
  test.skip(true, 'Requires seeded catalog and explicit sandbox env — see Phase 6 manual checklist')

  test('admin product to customer download', async ({ page }) => {
    await page.goto('/shop')
    await expect(page.getByRole('heading', { name: /فروشگاه/i })).toBeVisible()
  })
})