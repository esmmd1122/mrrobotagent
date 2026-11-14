import type { AIProvider } from '../types'

/** Rules engine when no LLM provider is connected — uses tools directly from keywords */
export const rulesProvider: AIProvider = {
  id: 'rules',
  getProviderStatus() {
    return {
      state: 'configuration_required',
      provider: 'rules',
      message: 'فقط موتور قوانین فعال است؛ برای ایجنت کامل یک ارائه‌دهنده AI متصل کنید',
      lastTestAt: null,
      lastError: '',
    }
  },
  async validateCredentials() {
    return { ok: true }
  },
  async generateResponse({ user, onToolCall }) {
    const text = user.trim()
    if (/ساعت|شیفت|باز/.test(text)) {
      const result = await onToolCall('getBusinessInfo', {})
      return { text: formatTool(result), tokens: 0 }
    }
    if (/قیمت|خدمت|سرویس/.test(text)) {
      const result = await onToolCall('getServices', {})
      return { text: formatTool(result), tokens: 0 }
    }
    if (/پرسنل|آرایشگر/.test(text)) {
      const result = await onToolCall('getEmployees', {})
      return { text: formatTool(result), tokens: 0 }
    }
    if (/نوبت|خالی|زمان/.test(text)) {
      const services = JSON.parse(await onToolCall('getServices', {})) as {
        ok: boolean
        services?: { id: string; name: string }[]
      }
      const first = services.services?.[0]
      if (!first) return { text: 'خدمتی ثبت نشده است.', tokens: 0 }
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date())
      const result = await onToolCall('getAvailableSlots', { offeringId: first.id, date: today })
      return { text: formatTool(result), tokens: 0 }
    }
    if (/سوالات|متداول|faq/i.test(text)) {
      const result = await onToolCall('searchFaqs', { query: text })
      return { text: formatTool(result), tokens: 0 }
    }
    return {
      text:
        'می‌توانم درباره خدمات، قیمت، ساعت کاری و زمان‌های آزاد پاسخ بدهم. برای رزرو، لغو یا جابه‌جایی بعد از تایید شماره، دقیق بگویید چه می‌خواهید. برای اتصال هوش مصنوعی کامل، در پنل سالن بخش اتصال ایجنت‌ها را باز کنید.',
      tokens: 0,
    }
  },
}

function formatTool(json: string) {
  try {
    const data = JSON.parse(json) as Record<string, unknown>
    if (data.error) return String(data.error)
    return JSON.stringify(data, null, 2)
  } catch {
    return json
  }
}
