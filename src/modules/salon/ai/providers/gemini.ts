import type { AIProvider, ProviderCredentialConfig, ProviderStatus } from '../types'
import type { ToolDefinition } from '../types'

const DEFAULT_MODEL = 'gemini-2.0-flash'

export const geminiProvider: AIProvider = {
  id: 'gemini',
  getProviderStatus(credentialPresent, lastTestOk, lastError) {
    if (!credentialPresent) {
      return {
        state: 'configuration_required',
        provider: 'gemini',
        message: 'کلید API Gemini تنظیم نشده است',
        lastTestAt: null,
        lastError,
      }
    }
    if (!lastTestOk) {
      return {
        state: 'error',
        provider: 'gemini',
        message: lastError || 'آخرین تست اتصال ناموفق بود',
        lastTestAt: null,
        lastError,
      }
    }
    return {
      state: 'connected',
      provider: 'gemini',
      message: 'اتصال Gemini تأیید شده است',
      lastTestAt: null,
      lastError: '',
    }
  },
  async validateCredentials(config: ProviderCredentialConfig) {
    if (!config.apiKey) return { ok: false, error: 'کلید API خالی است' }
    const model = config.model || DEFAULT_MODEL
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 8 },
        }),
      },
    )
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: text.slice(0, 240) || res.statusText }
    }
    return { ok: true }
  },
  async generateResponse({ system, user, tools, onToolCall }) {
    const apiKey = process.env.GEMINI_API_KEY_OVERRIDE || ''
    const model = DEFAULT_MODEL
    const declarations = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }))
    const contents: unknown[] = [{ role: 'user', parts: [{ text: user }] }]
    let tokens = 0
    for (let step = 0; step < 6; step++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents,
            tools: [{ functionDeclarations: declarations }],
          }),
        },
      )
      if (!res.ok) throw new Error(`Gemini error ${res.status}`)
      const data = (await res.json()) as {
        candidates?: {
          content?: {
            parts?: {
              text?: string
              functionCall?: { name: string; args: Record<string, unknown> }
            }[]
          }
        }[]
        usageMetadata?: { totalTokenCount?: number }
      }
      tokens += data.usageMetadata?.totalTokenCount || 0
      const parts = data.candidates?.[0]?.content?.parts || []
      const fn = parts.find((p) => p.functionCall)?.functionCall
      if (fn) {
        const result = await onToolCall(fn.name, fn.args || {})
        contents.push({
          role: 'model',
          parts: [{ functionCall: { name: fn.name, args: fn.args } }],
        })
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name: fn.name, response: { result } } }],
        })
        continue
      }
      const text = parts.map((p) => p.text || '').join('\n').trim()
      if (text) return { text, tokens }
      break
    }
    return { text: 'پاسخی تولید نشد. لطفاً دوباره بپرسید.', tokens }
  },
}

export function geminiProviderWithKey(apiKey: string, model?: string | null): AIProvider {
  return {
    ...geminiProvider,
    async validateCredentials(config) {
      return geminiProvider.validateCredentials({ ...config, apiKey: config.apiKey || apiKey })
    },
    async generateResponse(input) {
      const useModel = model || DEFAULT_MODEL
      const declarations = input.tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }))
      const contents: unknown[] = [{ role: 'user', parts: [{ text: input.user }] }]
      let tokens = 0
      for (let step = 0; step < 6; step++) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: input.system }] },
              contents,
              tools: [{ functionDeclarations: declarations }],
            }),
          },
        )
        if (!res.ok) throw new Error(`Gemini error ${res.status}`)
        const data = (await res.json()) as {
          candidates?: {
            content?: {
              parts?: {
                text?: string
                functionCall?: { name: string; args: Record<string, unknown> }
              }[]
            }
          }[]
          usageMetadata?: { totalTokenCount?: number }
        }
        tokens += data.usageMetadata?.totalTokenCount || 0
        const parts = data.candidates?.[0]?.content?.parts || []
        const fn = parts.find((p) => p.functionCall)?.functionCall
        if (fn) {
          const result = await input.onToolCall(fn.name, fn.args || {})
          contents.push({ role: 'model', parts: [{ functionCall: { name: fn.name, args: fn.args } }] })
          contents.push({
            role: 'user',
            parts: [{ functionResponse: { name: fn.name, response: { result } } }],
          })
          continue
        }
        const text = parts.map((p) => p.text || '').join('\n').trim()
        if (text) return { text, tokens }
        break
      }
      return { text: 'پاسخی تولید نشد.', tokens }
    },
  }
}
