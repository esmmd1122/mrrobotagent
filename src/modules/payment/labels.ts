export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: 'پرداخت‌نشده',
  PAID: 'پرداخت‌شده',
  FAILED: 'ناموفق',
  REFUNDED: 'مستردشده',
}

export const PAYMENT_TX_STATUS_LABELS: Record<string, string> = {
  INITIATED: 'ایجادشده',
  REDIRECTED: 'هدایت به درگاه',
  VERIFIED: 'تأییدشده',
  FAILED: 'ناموفق',
  CANCELLED: 'لغوشده',
}

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  zarinpal: 'زرین‌پال',
  sandbox: 'درگاه آزمایشی',
}

export function paymentStatusLabelFa(status: string): string {
  return PAYMENT_STATUS_LABELS[status] || status
}

export function paymentTxStatusLabelFa(status: string): string {
  return PAYMENT_TX_STATUS_LABELS[status] || status
}

export function paymentProviderLabelFa(provider: string): string {
  return PAYMENT_PROVIDER_LABELS[provider] || provider
}

/**
 * Only allow http(s) absolute URLs or clean same-origin relative paths for payment redirects.
 * Rejects javascript:, data:, vbscript:, and protocol-relative //evil.com URLs.
 */
export function isSafePaymentRedirectUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true
  }
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
