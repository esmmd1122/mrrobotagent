import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const created: string[] = []

test.afterAll(async () => {
  if (created.length) {
    await prisma.salonBusiness.deleteMany({ where: { slug: { in: created } } })
  }
  await prisma.$disconnect()
})

test('salon owner and customer can manage a real booking', async ({ page, request }) => {
  const stamp = `${Date.now()}${test.info().project.name}`
  const slug = `pw${stamp}`.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)
  const other = `${slug}b`.slice(0, 24)
  created.push(slug, other)
  const email = `${slug}@example.com`

  await page.goto('/studio/register')
  await page.getByPlaceholder('نام سالن').fill('سالن آزمایش')
  await page.getByPlaceholder('شناسه انگلیسی مثل liana-salon').fill(slug)
  await page.getByPlaceholder('نام شما').fill('مالک')
  await page.getByPlaceholder('ایمیل').fill(email)
  await page.getByPlaceholder('رمز عبور').fill('password123')
  const registered = page.waitForResponse((response) => response.url().includes('/api/studio/register'))
  await page.getByRole('button', { name: 'ادامه راه‌اندازی' }).click()
  const registerResponse = await registered
  expect(registerResponse.ok()).toBeTruthy()
  await page.waitForURL((url) => url.pathname === '/studio', { timeout: 150000 })
  await expect(page.getByRole('heading', { name: 'سالن آزمایش' })).toBeVisible()

  await page.goto('/studio/team', { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('نام').fill('نیلوفر')
  const employeeSaved = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/studio/team'),
  )
  await page.getByRole('button', { name: 'افزودن' }).click()
  expect((await employeeSaved).ok()).toBeTruthy()
  await expect(page.getByText('نیلوفر')).toBeVisible()
  await page.reload()
  await expect(page.getByText('نیلوفر')).toBeVisible()

  await page.goto('/studio/services', { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('نام خدمت').fill('کوتاهی')
  await page.getByPlaceholder('قیمت تومان').fill('250000')
  await page.getByPlaceholder('مدت دقیقه').fill('30')
  await page.getByLabel('نیلوفر').check()
  const serviceSaved = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/studio/services'),
  )
  await page.getByRole('button', { name: 'افزودن خدمت' }).click()
  expect((await serviceSaved).ok()).toBeTruthy()
  await expect(page.getByText('کوتاهی')).toBeVisible()
  await page.reload()
  await expect(page.getByText('کوتاهی')).toBeVisible()
  await page.screenshot({ path: `test-results/service-${test.info().project.name}.png`, fullPage: true })

  await page.goto('/studio/settings', { waitUntil: 'domcontentloaded' })
  const published = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/studio/settings'),
  )
  await page.getByRole('button', { name: 'انتشار صفحه رزرو' }).click()
  expect((await published).ok()).toBeTruthy()
  await expect(page.getByText(`/salon/${slug}`)).toBeVisible()

  await page.goto('/studio/schedule', { waitUntil: 'domcontentloaded' })
  await page.locator('input[name="date"]').first().fill('2027-01-01')
  const holidaySaved = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/studio/schedule'),
  )
  await page.getByRole('button', { name: 'ثبت تعطیلی' }).click()
  expect((await holidaySaved).ok()).toBeTruthy()
  await expect(page.getByText('2027-01-01')).toBeVisible()
  await page.reload()
  await expect(page.getByText('2027-01-01')).toBeVisible()
  await page.screenshot({ path: `test-results/holiday-${test.info().project.name}.png`, fullPage: true })

  const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  const later = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
  const soonYmd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(soon)
  const laterYmd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(later)

  await page.goto(`/salon/${slug}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'سالن آزمایش' })).toBeVisible()
  await page.locator('input[type="date"]').fill(soonYmd)
  const slotsLoaded = page.waitForResponse((response) => response.url().includes('/slots'))
  await page.getByRole('button', { name: 'نمایش زمان‌ها' }).click()
  expect((await slotsLoaded).ok()).toBeTruthy()
  const slot = page.locator('button').filter({ hasText: 'نیلوفر' }).first()
  await expect(slot).toBeVisible()
  await page.screenshot({ path: `test-results/slots-${test.info().project.name}.png`, fullPage: true })
  await page.getByPlaceholder('09xxxxxxxxx').fill('09120001111')
  const otpSent = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/otp'),
  )
  await page.getByRole('button', { name: 'دریافت کد' }).click()
  expect((await otpSent).ok()).toBeTruthy()
  const dev = page.locator('text=کد توسعه:')
  await expect(dev).toBeVisible()
  const code = (await dev.innerText()).replace(/\D/g, '')
  await page.getByPlaceholder('کد تایید').fill(code)
  await page.getByRole('button', { name: 'تایید کد' }).click()
  await expect(page.getByText('شماره تایید شد')).toBeVisible()
  await slot.click()
  await expect(page.getByText('نوبت ثبت شد')).toBeVisible()

  await page.getByRole('button', { name: 'پیگیری نوبت' }).click()
  const manageOtp = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/otp'),
  )
  await page.getByRole('button', { name: 'دریافت کد' }).click()
  expect((await manageOtp).ok()).toBeTruthy()
  const manageCode = ((await page.locator('text=کد توسعه:').innerText()).replace(/\D/g, ''))
  await page.getByPlaceholder('کد تایید').fill(manageCode)
  await page.getByRole('button', { name: 'تایید کد' }).click()
  await expect(page.getByText('کوتاهی')).toBeVisible()

  await page.getByRole('button', { name: 'تغییر نوبت' }).click()
  await page.getByRole('button', { name: 'انتخاب برای تغییر' }).click()
  await page.locator('input[type="date"]').last().fill(laterYmd)
  await page.getByRole('button', { name: 'زمان‌های آزاد' }).click()
  await page.locator('button').filter({ hasText: ':' }).last().click()
  await expect(page.getByText('زمان نوبت عوض شد')).toBeVisible()

  await page.getByRole('button', { name: 'لغو نوبت' }).click()
  await page.getByRole('button', { name: 'تایید لغو' }).click()
  await expect(page.getByText('نوبت لغو شد')).toBeVisible()

  await page.goto('/studio/calendar', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'روزانه' }).click()
  await page.getByRole('button', { name: 'هفتگی' }).click()
  await page.getByRole('button', { name: 'ماهانه' }).click()
  await page.locator('select').first().selectOption({ label: 'نیلوفر' })
  await expect(page.getByRole('heading', { name: 'تقویم نوبت‌ها' })).toBeVisible()

  await request.post('/api/studio/register', {
    data: {
      salonName: 'سالن دوم',
      slug: other,
      ownerName: 'دیگر',
      email: `${other}@example.com`,
      password: 'password123',
    },
  })
  const booking = await prisma.salonBooking.findFirst({ where: { business: { slug } } })
  const crossed = await request.post(`/api/salon/${other}/cancel`, {
    data: { bookingId: booking?.id || 'missing' },
  })
  expect(crossed.status()).toBe(401)
})
