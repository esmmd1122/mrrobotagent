import { z } from 'zod'

const fieldDefSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[a-z0-9_-]+$/i),
  label: z.string().min(1).max(120),
  type: z.enum(['text', 'textarea', 'email']),
  required: z.boolean().optional().default(false),
  maxLength: z.number().int().min(1).max(2000).optional().default(500),
})

export type PurchaseFieldDef = z.infer<typeof fieldDefSchema>

export function parseProductPurchaseFields(json: string): PurchaseFieldDef[] {
  try {
    const raw = JSON.parse(json || '[]')
    if (!Array.isArray(raw)) return []
    const out: PurchaseFieldDef[] = []
    for (const row of raw) {
      const parsed = fieldDefSchema.safeParse(row)
      if (parsed.success) out.push(parsed.data)
    }
    return out
  } catch {
    return []
  }
}

export function validatePurchaseFieldAnswers(
  defs: PurchaseFieldDef[],
  formData: FormData | Record<string, string | undefined>,
): { ok: true; answers: Record<string, string>; deliveryInfo: string } | { ok: false; error: string } {
  const get = (key: string) => {
    if (formData instanceof FormData) return String(formData.get(`pf_${key}`) ?? '').trim()
    return String(formData[key] ?? '').trim()
  }

  const answers: Record<string, string> = {}
  for (const def of defs) {
    const value = get(def.id)
    if (def.required && !value) {
      return { ok: false, error: `فیلد «${def.label}» الزامی است.` }
    }
    if (!value) continue
    if (value.length > def.maxLength) {
      return { ok: false, error: `فیلد «${def.label}» خیلی طولانی است.` }
    }
    if (def.type === 'email' && !z.string().email().safeParse(value).success) {
      return { ok: false, error: `ایمیل در «${def.label}» نامعتبر است.` }
    }
    answers[def.id] = value
  }

  const deliveryInfo =
    defs.length === 0
      ? ''
      : JSON.stringify({
          kind: 'customer_purchase_info',
          fields: defs.map((d) => ({ id: d.id, label: d.label, value: answers[d.id] ?? '' })),
        })

  return { ok: true, answers, deliveryInfo }
}

export function formatPurchaseInfoForAdmin(deliveryInfo: string | null | undefined): string | null {
  if (!deliveryInfo?.trim()) return null
  try {
    const parsed = JSON.parse(deliveryInfo)
    if (parsed?.kind !== 'customer_purchase_info' || !Array.isArray(parsed.fields)) {
      return deliveryInfo
    }
    return parsed.fields
      .filter((f: { value?: string }) => f.value)
      .map((f: { label: string; value: string }) => `${f.label}: ${f.value}`)
      .join('\n')
  } catch {
    return deliveryInfo
  }
}