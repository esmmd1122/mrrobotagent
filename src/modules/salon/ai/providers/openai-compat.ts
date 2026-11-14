import type { AIProvider, ProviderCredentialConfig } from '../types'

const DEFAULT_MODEL = 'gpt-4o-mini'

export function openAiCompatProvider(apiKey: string, baseUrl: string, model?: string | null): AIProvider {
  const root = baseUrl.replace(/\/$/, '')
  const useModel = model || DEFAULT_MODEL
  return {
    id: 'openai_compat',
    getProviderStatus(credentialPresent, lastTestOk, lastError) {
      if (!credentialPresent) {
        return {
          state: 'configuration_required',
          provider: 'openai_compat',
          message: 'کلید API تنظیم نشده است',
          lastTestAt: null,
          lastError,
        }
      }
      if (!lastTestOk) {
        return {
          state: 'error',
          provider: 'openai_compat',
          message: lastError || 'تست اتصال ناموفق',
          lastTestAt: null,
          lastError,
        }
      }
      return {
        state: 'connected',
        provider: 'openai_compat',
        message: 'اتصال تأیید شده است',
        lastTestAt: null,
        lastError: '',
      }
    },
    async validateCredentials(config: ProviderCredentialConfig) {
      if (!config.apiKey) return { ok: false, error: 'کلید API خالی است' }
      const url = `${(config.baseUrl || root).replace(/\/$/, '')}/chat/completions`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || useModel,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      })
      if (!res.ok) {
        return { ok: false, error: (await res.text()).slice(0, 240) }
      }
      return { ok: true }
    },
    async generateResponse({ system, user, tools, onToolCall }) {
      const openaiTools = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }))
      const messages: unknown[] = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]
      let tokens = 0
      for (let step = 0; step < 6; step++) {
        const res = await fetch(`${root}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model: useModel, messages, tools: openaiTools }),
        })
        if (!res.ok) throw new Error(`OpenAI-compatible error ${res.status}`)
        const data = (await res.json()) as {
          usage?: { total_tokens?: number }
          choices?: {
            message?: {
              content?: string | null
              tool_calls?: { id: string; function: { name: string; arguments: string } }[]
            }
          }[]
        }
        tokens += data.usage?.total_tokens || 0
        const message = data.choices?.[0]?.message
        if (message?.tool_calls?.length) {
          messages.push(message)
          for (const call of message.tool_calls) {
            const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
            const result = await onToolCall(call.function.name, args)
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: result,
            })
          }
          continue
        }
        const text = message?.content?.trim()
        if (text) return { text, tokens }
        break
      }
      return { text: 'پاسخی تولید نشد.', tokens }
    },
  }
}
