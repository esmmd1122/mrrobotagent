/**
 * Store monetary convention: admin enters numeric amounts in Tomans.
 * No automatic Rial ↔ Toman conversion anywhere in the commerce module.
 */
export const STORE_CURRENCY_CODE = 'TOMAN' as const

export const STORE_CURRENCY_LABEL_FA = 'تومان'

export function storeCurrencyLabel(code: string) {
  if (code === STORE_CURRENCY_CODE) return STORE_CURRENCY_LABEL_FA
  if (code === 'IRR') return 'ریال'
  return code
}

export function formatStoreMoney(amount: number, currency: string = STORE_CURRENCY_CODE) {
  return `${new Intl.NumberFormat('fa-IR').format(amount)} ${storeCurrencyLabel(currency)}`
}