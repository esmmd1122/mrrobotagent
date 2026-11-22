import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AI_PROJECT_CATEGORIES,
  AI_PROJECT_STATUSES,
  adminUpdateAiProjectSchema,
  aiProjectRequestSchema,
  buildSafeContactLinks,
  parseAIProjectRecord,
  serializeAIProjectPayload,
} from './ai-projects'

test('defines all 6 required AI project categories and 8 admin statuses', () => {
  assert.equal(AI_PROJECT_CATEGORIES.length, 6)
  assert.deepEqual(
    AI_PROJECT_CATEGORIES.map((c) => c.titleEn),
    [
      'Personal AI Assistant',
      'Business AI Assistant',
      'AI Phone Receptionist',
      'AI Booking System',
      'Business Automation',
      'Website and Telegram AI Assistant',
    ],
  )
  assert.equal(AI_PROJECT_STATUSES.length, 8)
})

test('aiProjectRequestSchema validates complete Persian business request and rejects missing contact', () => {
  const valid = aiProjectRequestSchema.safeParse({
    projectType: 'business-ai-assistant',
    usageScope: 'BUSINESS',
    features: ['پاسخ‌گویی سریع فارسی ۲۴/۷'],
    integrations: ['وب‌سایت', 'تلگرام'],
    expectedFunctionality: 'پاسخ‌گویی خودکار به مشتریان فروشگاه و ثبت سفارش مشاوره.',
    additionalDescription: 'پشتیبانی از فایل PDF کاتالوگ محصولات.',
    contactName: 'سارا محمدی',
    contactPhone: '09121234567',
    contactEmail: 'sara@example.com',
    contactTelegram: '@sara_m',
  })
  assert.equal(valid.success, true)

  const missingContact = aiProjectRequestSchema.safeParse({
    projectType: 'personal-ai-assistant',
    usageScope: 'PERSONAL',
    features: [],
    integrations: [],
    expectedFunctionality: 'مدیریت برنامه روزانه و خلاصه پیام‌ها در تلگرام.',
    contactName: 'علی رضایی',
    contactPhone: '',
    contactEmail: '',
    contactTelegram: '',
  })
  assert.equal(missingContact.success, false)

  const badEmail = aiProjectRequestSchema.safeParse({
    projectType: 'ai-booking-system',
    usageScope: 'BUSINESS',
    expectedFunctionality: 'سیستم رزرو آنلاین کلینیک دندانپزشکی با یادآوری.',
    contactName: 'دکتر امینی',
    contactEmail: 'invalid-email',
  })
  assert.equal(badEmail.success, false)
})

test('parseAIProjectRecord parses both structured v1 payloads and legacy plain-text requests', () => {
  const serialized = serializeAIProjectPayload({
    __mrrobotAiProjectV1: true,
    referenceCode: 'MR-AI-1234ABCD',
    projectType: 'ai-phone-receptionist',
    projectTypeTitleFa: 'منشی تلفنی و اپراتور صوتی هوشمند',
    projectTypeTitleEn: 'AI Phone Receptionist',
    usageScope: 'BUSINESS',
    features: ['پاسخ‌گویی صوتی هوشمند فارسی'],
    integrations: ['تلفن و VoIP'],
    expectedFunctionality: 'پاسخ‌گویی به تماس‌های کلینیک و ثبت درخواست نوبت.',
    additionalDescription: 'اتصال به خط ثابت شرکت',
    contactName: 'مهرداد کریمی',
    contactPhone: '09120001122',
    contactEmail: '',
    contactTelegram: '@mehrdad',
    ticketId: 'ticket-99',
    proposedPrice: 18500000,
    estimatedDelivery: '۱۰ روز کاری',
    internalNote: 'نیاز به بررسی خط VoIP',
  })

  const structured = parseAIProjectRecord({
    id: 'req-1',
    title: 'پروژه هوش مصنوعی: منشی تلفنی و اپراتور صوتی هوشمند',
    description: serialized,
    status: 'QUOTATION_SENT',
    contact: '09120001122 | @mehrdad',
    delivery: 'قیمت پیشنهادی: ۱۸٬۵۰۰٬۰۰۰ تومان | زمان تحویل: ۱۰ روز کاری',
    createdAt: new Date('2026-11-22T10:00:00Z'),
    updatedAt: new Date('2026-11-22T12:00:00Z'),
    customerId: 'cust-1',
    customer: { name: 'مهرداد کریمی', email: null, phone: '09120001122' },
  })

  assert.equal(structured.isStructured, true)
  assert.equal(structured.projectType, 'ai-phone-receptionist')
  assert.equal(structured.proposedPrice, 18500000)
  assert.equal(structured.estimatedDelivery, '۱۰ روز کاری')
  assert.equal(structured.internalNote, 'نیاز به بررسی خط VoIP')
  assert.equal(structured.ticketId, 'ticket-99')

  const legacy = parseAIProjectRecord({
    id: 'legacy-1',
    title: 'درخواست: دستیار شخصی',
    description: 'نیاز به یک ربات یادآوری ساده دارم.',
    status: 'NEW',
    contact: 'legacy@example.com',
    delivery: null,
    createdAt: new Date('2026-10-01T10:00:00Z'),
    updatedAt: new Date('2026-10-01T10:00:00Z'),
    customerId: null,
    customer: null,
  })
  assert.equal(legacy.isStructured, false)
  assert.equal(legacy.expectedFunctionality, 'نیاز به یک ربات یادآوری ساده دارم.')
  assert.equal(legacy.contactEmail, 'legacy@example.com')
})

test('adminUpdateAiProjectSchema enforces allowed statuses and positive price', () => {
  assert.equal(
    adminUpdateAiProjectSchema.safeParse({
      status: 'QUOTATION_SENT',
      proposedPrice: 25000000,
      estimatedDelivery: '۲ هفته',
      internalNote: 'ارسال شد برای مشتری',
    }).success,
    true,
  )
  assert.equal(
    adminUpdateAiProjectSchema.safeParse({
      status: 'INVALID_STATUS',
    }).success,
    false,
  )
  assert.equal(
    adminUpdateAiProjectSchema.safeParse({
      status: 'UNDER_REVIEW',
      proposedPrice: -100,
    }).success,
    false,
  )
})

test('buildSafeContactLinks sanitizes phone, email, and telegram links safely', () => {
  const safe = buildSafeContactLinks({
    phone: '+98 912-123-4567',
    email: 'user@example.com',
    telegram: 'https://t.me/mrrobot_user',
  })
  assert.equal(safe.telHref, 'tel:+989121234567')
  assert.equal(safe.mailtoHref, 'mailto:user@example.com')
  assert.equal(safe.telegramHref, 'https://t.me/mrrobot_user')

  const malicious = buildSafeContactLinks({
    phone: 'javascript:alert(1)',
    email: 'javascript:alert(1)',
    telegram: 'javascript:alert(1)',
  })
  assert.equal(malicious.telHref, null)
  assert.equal(malicious.mailtoHref, null)
  assert.equal(malicious.telegramHref, 'https://t.me/javascriptalert1')
})
