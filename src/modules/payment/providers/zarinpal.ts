import type { InitiatePaymentContext, InitiatePaymentResult, PaymentProvider, VerifyPaymentContext, VerifyPaymentResult } from '../types'

type GatewaySettings = { merchant_id?: string; sandbox?: boolean }

function parseSettings(raw: string): GatewaySettings {
  try {
    return JSON.parse(raw) as GatewaySettings
  } catch {
    return {}
  }
}

export function createZarinpalProvider(settingsJson: string): PaymentProvider {
  const settings = parseSettings(settingsJson)
  const hasMerchant = Boolean(settings.merchant_id?.trim())

  return {
    id: 'zarinpal',
    async initiate(_ctx: InitiatePaymentContext): Promise<InitiatePaymentResult> {
      if (!hasMerchant) {
        return {
          ok: false,
          code: 'NOT_CONFIGURED',
          message: 'درگاه زرین‌پال پیکربندی نشده است (merchant_id).',
        }
      }
      return {
        ok: false,
        code: 'NOT_CONFIGURED',
        message: 'اتصال API زرین‌پال هنوز فعال نشده — پس از دریافت credential پیاده‌سازی می‌شود.',
      }
    },
    async verify(_ctx: VerifyPaymentContext): Promise<VerifyPaymentResult> {
      return { verified: false, reason: 'درگاه پیکربندی نشده' }
    },
    parseCallback(body: unknown, searchParams: URLSearchParams) {
      const fromQuery = Object.fromEntries(searchParams.entries())
      if (body && typeof body === 'object') {
        return { ...(body as Record<string, unknown>), ...fromQuery }
      }
      return fromQuery
    },
  }
}