import { z } from 'zod'

const ERROR_CODE_MESSAGES_FA: Record<string, string> = {
  invalid: 'لطفاً نام، حداقل یکی از اطلاعات تماس (ایمیل یا موبایل) و پذیرش قوانین را به‌درستی تکمیل کنید.',
  invalid_plan: 'طرح انتخاب‌شده برای این محصول معتبر نیست. لطفاً دوباره انتخاب کنید.',
  select_plan: 'لطفاً ابتدا یکی از طرح‌های فعال این اشتراک را انتخاب کنید.',
  'not-purchasable': 'این محصول در حال حاضر برای خرید آنلاین فعال نیست. برای سفارش با پشتیبانی تماس بگیرید.',
  not_purchasable: 'این محصول در حال حاضر برای خرید آنلاین فعال نیست. برای سفارش با پشتیبانی تماس بگیرید.',
  forbidden: 'دسترسی به این سفارش مجاز نیست.',
  sandbox_disabled: 'درگاه آزمایشی در این محیط غیرفعال است.',
  NO_GATEWAY: 'درگاه پرداخت آنلاین در حال حاضر غیرفعال است.',
}

export function safeDecodeParam(raw: string | null | undefined): string {
  if (!raw) return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function resolveStorefrontErrorMessage(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const decoded = safeDecodeParam(raw).trim()
  if (!decoded) return null
  return ERROR_CODE_MESSAGES_FA[decoded] ?? decoded
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function normalizeDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
}

export function normalizePhoneInput(raw: string): string {
  const normalized = normalizeDigits(raw).trim()
  return normalized.replace(/[\s\-()]/g, '')
}

const emailSchema = z.string().email()
const phoneSchema = z.string().regex(/^\+?[0-9]{7,16}$/)

export type ValidatedCheckoutContact =
  | {
      ok: true
      name: string
      email: string
      phone: string
      discountCode: string
    }
  | { ok: false; error: string }

export function validateCheckoutContact(input: {
  name: string
  email: string
  phone: string
  discountCode?: string
  termsAccepted: boolean
  fallbackEmail?: string | null
}): ValidatedCheckoutContact {
  const name = input.name.trim()
  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: 'نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد.' }
  }

  const email = input.email.trim().toLowerCase()
  if (email && !emailSchema.safeParse(email).success) {
    return { ok: false, error: 'فرمت ایمیل واردشده معتبر نیست.' }
  }

  const phone = normalizePhoneInput(input.phone)
  if (phone && !phoneSchema.safeParse(phone).success) {
    return { ok: false, error: 'شماره تماس واردشده معتبر نیست. لطفاً با اعداد صحیح وارد کنید (مثلاً 09123456789).' }
  }

  const effectiveEmail = email || input.fallbackEmail?.trim().toLowerCase() || ''
  if (!effectiveEmail && !phone) {
    return { ok: false, error: 'وارد کردن حداقل ایمیل یا شماره تماس برای ثبت و پیگیری سفارش الزامی است.' }
  }

  if (!input.termsAccepted) {
    return { ok: false, error: 'پذیرش قوانین و شرایط استفاده از خدمات الزامی است.' }
  }

  const discountCode = (input.discountCode ?? '').trim().slice(0, 32)
  return {
    ok: true,
    name,
    email,
    phone,
    discountCode,
  }
}
