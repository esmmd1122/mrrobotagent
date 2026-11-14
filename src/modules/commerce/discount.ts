import { prisma } from '@/lib/db'
import type { PricedCartLine } from './types'

export type DiscountResult = {
  code: string | null
  amount: number
  error?: string
}

function parseProductIds(json: string): string[] {
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export async function validateDiscountCode(
  rawCode: string | null | undefined,
  lines: PricedCartLine[],
  subtotal: number,
): Promise<DiscountResult> {
  if (!rawCode?.trim()) {
    return { code: null, amount: 0 }
  }

  const code = rawCode.trim().toUpperCase()
  const row = await prisma.discountCode.findUnique({ where: { code } })

  if (!row || !row.isActive) {
    return { code: null, amount: 0, error: 'کد تخفیف معتبر نیست.' }
  }

  const now = new Date()
  if (row.startsAt && row.startsAt > now) {
    return { code: null, amount: 0, error: 'کد تخفیف هنوز فعال نشده.' }
  }
  if (row.expiresAt && row.expiresAt < now) {
    return { code: null, amount: 0, error: 'کد تخفیف منقضی شده.' }
  }
  if (row.usageLimit != null && row.usageCount >= row.usageLimit) {
    return { code: null, amount: 0, error: 'سقف استفاده از این کد پر شده.' }
  }

  const restrictedIds = parseProductIds(row.productIdsJson)
  let applicableSubtotal = subtotal
  if (restrictedIds.length > 0) {
    applicableSubtotal = lines
      .filter((l) => restrictedIds.includes(l.productId))
      .reduce((s, l) => s + l.lineTotal, 0)
    if (applicableSubtotal <= 0) {
      return { code: null, amount: 0, error: 'این کد برای اقلام سبد شما قابل استفاده نیست.' }
    }
  }

  let amount = 0
  if (row.type === 'PERCENT') {
    amount = Math.round((applicableSubtotal * row.value) / 100)
  } else if (row.type === 'FIXED') {
    amount = Math.min(applicableSubtotal, row.value)
  } else {
    return { code: null, amount: 0, error: 'نوع تخفیف نامعتبر.' }
  }

  return { code, amount: Math.max(0, amount) }
}