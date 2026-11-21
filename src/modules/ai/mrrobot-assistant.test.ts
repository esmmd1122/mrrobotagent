import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_OPENAI_MODEL,
  MAX_CHAT_HISTORY_MESSAGES,
  MAX_CHAT_MESSAGE_LENGTH,
  buildMrRobotSystemInstructions,
  isOpenAiConfigured,
  resolveOpenAiModel,
  validateMrRobotChatPayload,
} from './mrrobot-assistant.ts'

test('isOpenAiConfigured detects missing or blank OPENAI_API_KEY safely', () => {
  assert.equal(isOpenAiConfigured({}), false)
  assert.equal(isOpenAiConfigured({ OPENAI_API_KEY: '   ' }), false)
  assert.equal(isOpenAiConfigured({ OPENAI_API_KEY: 'sk-test-value' }), true)
})

test('resolveOpenAiModel defaults safely and rejects invalid characters', () => {
  assert.equal(resolveOpenAiModel({}), DEFAULT_OPENAI_MODEL)
  assert.equal(resolveOpenAiModel({ OPENAI_MODEL: 'gpt-4.1-mini' }), 'gpt-4.1-mini')
  assert.equal(resolveOpenAiModel({ OPENAI_MODEL: 'invalid model! / injection' }), DEFAULT_OPENAI_MODEL)
})

test('validateMrRobotChatPayload enforces non-empty user message and bounds', () => {
  assert.equal(validateMrRobotChatPayload({}).ok, false)
  assert.equal(validateMrRobotChatPayload({ messages: [] }).ok, false)
  assert.equal(
    validateMrRobotChatPayload({ messages: [{ role: 'user', content: '   ' }] }).ok,
    false,
  )
  assert.equal(
    validateMrRobotChatPayload({
      messages: [{ role: 'assistant', content: 'سلام' }],
    }).ok,
    false,
  )
  assert.equal(
    validateMrRobotChatPayload({
      messages: [{ role: 'user', content: 'a'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1) }],
    }).ok,
    false,
  )
  assert.equal(
    validateMrRobotChatPayload({
      messages: Array.from({ length: MAX_CHAT_HISTORY_MESSAGES + 1 }, () => ({
        role: 'user',
        content: 'سلام',
      })),
    }).ok,
    false,
  )

  const ok = validateMrRobotChatPayload({
    messages: [
      { role: 'assistant', content: 'سلام! من MR.ROBOT هستم.' },
      { role: 'user', content: '  چه خدماتی ارائه میدید؟  ' },
    ],
  })
  assert.equal(ok.ok, true)
  if (ok.ok) {
    assert.equal(ok.messages[1].content, 'چه خدماتی ارائه میدید؟')
  }
})

test('buildMrRobotSystemInstructions enforces anonymous order privacy and grounds verified data', () => {
  const anonPrompt = buildMrRobotSystemInstructions({
    catalog: [
      {
        name: 'ChatGPT Plus',
        slug: 'chatgpt-plus',
        categoryName: 'ChatGPT Plus',
        priceSummary: 'تماس بگیرید',
        purchasable: false,
      },
    ],
    aiServicesList: ['دستیار هوش مصنوعی'],
    otherServicesList: ['خدمات اپل آیدی'],
    isAuthenticated: false,
    customerOrders: [
      {
        orderNumber: 'SHOULD-NOT-LEAK',
        statusFa: 'در انتظار پرداخت',
        paymentStatusFa: 'پرداخت‌نشده',
        fulfillmentStatusFa: 'در انتظار',
        totalFormatted: '۵۰۰٬۰۰۰ تومان',
        createdDateFa: '۱۴۰۵/۰۱/۰۱',
      },
    ],
  })

  assert.equal(anonPrompt.includes('SHOULD-NOT-LEAK'), false)
  assert.ok(anonPrompt.includes('/account/login'))
  assert.ok(anonPrompt.includes('ChatGPT Plus'))
  assert.ok(anonPrompt.includes('سفارش از طریق پشتیبانی/تماس'))

  const authPrompt = buildMrRobotSystemInstructions({
    catalog: [],
    aiServicesList: [],
    otherServicesList: [],
    isAuthenticated: true,
    customerOrders: [
      {
        orderNumber: 'MR-2026-1001',
        statusFa: 'در انتظار پرداخت',
        paymentStatusFa: 'پرداخت‌نشده',
        fulfillmentStatusFa: 'در انتظار',
        totalFormatted: '۹۵۰٬۰۰۰ تومان',
        createdDateFa: '۱۴۰۵/۰۲/۱۰',
      },
    ],
  })

  assert.ok(authPrompt.includes('MR-2026-1001'))
  assert.ok(authPrompt.includes('پرداخت‌نشده'))
})
