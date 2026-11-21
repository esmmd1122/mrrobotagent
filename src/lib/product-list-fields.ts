import { z } from 'zod'

export const MAX_PRODUCT_LIST_ITEMS = 50
export const MAX_PRODUCT_LIST_ITEM_LENGTH = 400

const productStringListSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(MAX_PRODUCT_LIST_ITEM_LENGTH),
  )
  .max(MAX_PRODUCT_LIST_ITEMS)

/**
 * Safely parses a stored JSON string-array column (detailsJson / featuresJson).
 * Preserves backward compatibility with:
 * - standard JSON string arrays: '["مورد ۱", "مورد ۲"]'
 * - empty / null / whitespace values -> []
 * - legacy non-JSON plain multiline text stored in older rows -> split by line
 */
export function parseStringListJson(raw: string | null | undefined): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (!trimmed) return []

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    }
    if (typeof parsed === 'string') {
      return splitLinesToCleanItems(parsed)
    }
    return []
  } catch {
    // Backward compatibility for any legacy plain-text value
    return splitLinesToCleanItems(trimmed)
  }
}

/**
 * Splits multiline plain text into trimmed, non-empty string items.
 */
export function splitLinesToCleanItems(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * Converts a stored JSON array string into user-friendly newline-separated text
 * for editing in admin textareas. Empty arrays render as an empty string.
 */
export function stringListJsonToLines(raw: string | null | undefined): string {
  return parseStringListJson(raw).join('\n')
}

/**
 * Converts user-entered admin textarea text (one item per line) into a clean string array.
 * Also gracefully accepts a pasted JSON string array (e.g. ["A", "B"]) for backward compatibility.
 */
export function linesToStringArray(input: string | null | undefined): string[] {
  if (!input) return []
  const trimmed = input.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return parsed.map((item) => item.trim()).filter((item) => item.length > 0)
      }
    } catch {
      // Fall through to normal line-by-line parsing (e.g. "[نسخه جدید] توضیح")
    }
  }

  return splitLinesToCleanItems(trimmed)
}

/**
 * Serializes admin line-by-line text into a canonical JSON string array before submission.
 */
export function serializeLinesToJsonArray(input: string | null | undefined): string {
  return JSON.stringify(linesToStringArray(input))
}

export type StringListValidationResult =
  | { ok: true; items: string[]; json: string }
  | { ok: false; error: string }

/**
 * Server-side validation for JSON string-array product fields (detailsJson, featuresJson).
 * Strictly validates JSON syntax, element types, item length, and item count.
 * Never bypasses validation: rejects malformed JSON or non-string array entries.
 */
export function validateProductStringListJson(
  raw: string | null | undefined,
  fieldLabelFa: string,
): StringListValidationResult {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) {
    return { ok: true, items: [], json: '[]' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return {
      ok: false,
      error: `فیلد ${fieldLabelFa} باید یک آرایه JSON معتبر از متن‌ها باشد.`,
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      error: `فیلد ${fieldLabelFa} باید یک آرایه JSON معتبر از متن‌ها باشد.`,
    }
  }

  if (!parsed.every((item) => typeof item === 'string')) {
    return {
      ok: false,
      error: `تمام موارد فیلد ${fieldLabelFa} باید از نوع متن باشند.`,
    }
  }

  const cleaned = (parsed as string[])
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (cleaned.length > MAX_PRODUCT_LIST_ITEMS) {
    return {
      ok: false,
      error: `تعداد موارد ${fieldLabelFa} نباید بیشتر از ${MAX_PRODUCT_LIST_ITEMS.toLocaleString('fa-IR')} مورد باشد.`,
    }
  }

  const tooLong = cleaned.find((item) => item.length > MAX_PRODUCT_LIST_ITEM_LENGTH)
  if (tooLong) {
    return {
      ok: false,
      error: `طول هر مورد در ${fieldLabelFa} نباید بیشتر از ${MAX_PRODUCT_LIST_ITEM_LENGTH.toLocaleString('fa-IR')} کاراکتر باشد.`,
    }
  }

  const validated = productStringListSchema.safeParse(cleaned)
  if (!validated.success) {
    return {
      ok: false,
      error: `مقادیر واردشده در فیلد ${fieldLabelFa} معتبر نیستند.`,
    }
  }

  return {
    ok: true,
    items: validated.data,
    json: JSON.stringify(validated.data),
  }
}
