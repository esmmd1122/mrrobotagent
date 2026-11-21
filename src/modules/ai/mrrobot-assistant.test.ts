import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_OPENAI_MODEL,
  MAX_CHAT_HISTORY_MESSAGES,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_CHAT_TOTAL_CHARS,
  buildMrRobotSystemInstructions,
  classifyOpenAiError,
  extractChatCompletionText,
  getSafeOpenAiEnvDiagnostics,
  isOpenAiConfigured,
  modelSupportsTemperature,
  resolveOpenAiModel,
  sanitizeOpenAiApiKey,
  validateMrRobotChatPayload,
} from './mrrobot-assistant.ts'

test('sanitizeOpenAiApiKey and isOpenAiConfigured handle whitespace, quotes, and newlines safely', () => {
  assert.equal(isOpenAiConfigured({}), false)
  assert.equal(isOpenAiConfigured({ OPENAI_API_KEY: '   ' }), false)
  assert.equal(sanitizeOpenAiApiKey({ OPENAI_API_KEY: '""' }), null)
  assert.equal(
    sanitizeOpenAiApiKey({ OPENAI_API_KEY: '  "sk-proj-test123"\r\n' }),
    'sk-proj-test123',
  )
  assert.equal(
    sanitizeOpenAiApiKey({ OPENAI_API_KEY: " 'sk-test-value' " }),
    'sk-test-value',
  )
  assert.equal(isOpenAiConfigured({ OPENAI_API_KEY: 'sk-test-value' }), true)

  const diag = getSafeOpenAiEnvDiagnostics({ OPENAI_API_KEY: ' "sk-secret" ' })
  assert.equal(diag.hasKey, true)
  assert.equal(diag.keyHadPaddingOrQuotes, true)
  assert.equal(JSON.stringify(diag).includes('sk-secret'), false)
})

test('resolveOpenAiModel and modelSupportsTemperature handle default, custom, and reasoning models', () => {
  assert.equal(resolveOpenAiModel({}), DEFAULT_OPENAI_MODEL)
  assert.equal(resolveOpenAiModel({ OPENAI_MODEL: 'gpt-4.1-mini' }), 'gpt-4.1-mini')
  assert.equal(resolveOpenAiModel({ OPENAI_MODEL: ' "gpt-4o-mini" ' }), 'gpt-4o-mini')
  assert.equal(
    resolveOpenAiModel({ OPENAI_MODEL: 'invalid model! / injection' }),
    DEFAULT_OPENAI_MODEL,
  )

  assert.equal(modelSupportsTemperature('gpt-4o-mini'), true)
  assert.equal(modelSupportsTemperature('gpt-4.1-mini'), true)
  assert.equal(modelSupportsTemperature('o1-mini'), false)
  assert.equal(modelSupportsTemperature('o3-mini'), false)
  assert.equal(modelSupportsTemperature('o4-mini'), false)
  assert.equal(modelSupportsTemperature('gpt-5-mini'), false)
})

test('validateMrRobotChatPayload enforces non-empty user message, turn bounds, and total char budget', () => {
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
  // Exceed total character cap across multiple valid-length messages
  const overBudgetCount = Math.ceil(MAX_CHAT_TOTAL_CHARS / 1000) + 1
  assert.equal(
    validateMrRobotChatPayload({
      messages: Array.from({ length: overBudgetCount }, () => ({
        role: 'user',
        content: 'x'.repeat(1000),
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

test('extractChatCompletionText extracts string and multipart assistant replies cleanly', () => {
  assert.equal(
    extractChatCompletionText({
      choices: [{ message: { content: '  سلام! چطور می‌تونم کمکتون کنم؟  ' } }],
    }),
    'سلام! چطور می‌تونم کمکتون کنم؟',
  )
  assert.equal(
    extractChatCompletionText({
      choices: [
        {
          message: {
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'text', text: 'from MR.ROBOT' },
            ],
          },
        },
      ],
    }),
    'Hello from MR.ROBOT',
  )
  assert.equal(extractChatCompletionText({ choices: [] }), null)
  assert.equal(extractChatCompletionText(null), null)
})

test('classifyOpenAiError distinguishes auth, quota, rate limit, model access, bad request, timeout, and network errors', () => {
  assert.equal(
    classifyOpenAiError({ status: 401, code: 'invalid_api_key', message: 'Incorrect API key' })
      .category,
    'AUTH_ERROR',
  )
  assert.equal(
    classifyOpenAiError({
      status: 429,
      code: 'insufficient_quota',
      message: 'You exceeded your current quota',
    }).category,
    'INSUFFICIENT_QUOTA',
  )
  assert.equal(
    classifyOpenAiError({
      status: 429,
      code: 'rate_limit_exceeded',
      message: 'Rate limit reached',
    }).category,
    'UPSTREAM_RATE_LIMIT',
  )
  assert.equal(
    classifyOpenAiError({ status: 404, code: 'model_not_found', message: 'The model does not exist' })
      .category,
    'MODEL_ACCESS_ERROR',
  )
  assert.equal(
    classifyOpenAiError({ status: 400, type: 'invalid_request_error', message: 'Unsupported param' })
      .category,
    'INVALID_REQUEST',
  )
  assert.equal(
    classifyOpenAiError(Object.assign(new Error('Request timed out'), { name: 'APIConnectionTimeoutError' }))
      .category,
    'TIMEOUT',
  )
  assert.equal(
    classifyOpenAiError(Object.assign(new Error('Connection error'), { name: 'APIConnectionError' }))
      .category,
    'NETWORK_ERROR',
  )
})

test('buildMrRobotSystemInstructions enforces anonymous order privacy and grounds verified product plans & features', () => {
  const anonPrompt = buildMrRobotSystemInstructions({
    catalog: [
      {
        name: 'چت جی پی تی پلاس',
        nameEn: 'ChatGPT Plus',
        slug: 'chatgpt-plus',
        categoryName: 'هوش مصنوعی',
        priceSummary: '۱٬۴۵۰٬۰۰۰ ریال',
        originalPriceSummary: '۱٬۸۰۰٬۰۰۰ ریال',
        discountPercent: 19,
        purchasable: true,
        features: ['دسترسی کامل GPT-4o', 'فعال‌سازی ایمن'],
        plans: [
          {
            title: 'یک‌ماهه',
            durationLabel: '1 ماه',
            priceFormatted: '۱٬۴۵۰٬۰۰۰ ریال',
          },
        ],
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
  assert.ok(anonPrompt.includes('دسترسی کامل GPT-4o'))
  assert.ok(anonPrompt.includes('یک‌ماهه'))

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
