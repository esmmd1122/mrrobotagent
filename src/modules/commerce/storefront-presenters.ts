import type { PricedCartLine } from './types'

export type ShopFilterProduct = {
  id: string
  slug: string
  nameFa: string
  nameEn: string | null
  description: string
  purchasable: boolean
}

export type ShopFilterCategory<T extends ShopFilterProduct = ShopFilterProduct> = {
  id: string
  slug: string
  nameFa: string
  nameEn: string | null
  products: T[]
}

export type ProductFaqItem = {
  id: string
  question: string
  answer: string
}

/**
 * Computes real display-only catalog savings when products/plans have a promo price
 * lower than their list price. Never modifies server totals.
 */
export function computeCartSavings(
  lines: Pick<PricedCartLine, 'listUnitPrice' | 'unitPrice' | 'quantity'>[],
): number {
  let savings = 0
  for (const line of lines) {
    if (line.listUnitPrice > line.unitPrice && line.quantity > 0) {
      savings += (line.listUnitPrice - line.unitPrice) * line.quantity
    }
  }
  return Math.max(0, Math.round(savings))
}

/**
 * Filters shop categories and products by search query, active category slug,
 * and optional online-purchasable filter. Pure function for fast client filtering.
 */
export function filterShopCategories<T extends ShopFilterProduct>(
  categories: ShopFilterCategory<T>[],
  options: {
    query?: string
    categorySlug?: string
    onlyPurchasable?: boolean
  },
): ShopFilterCategory<T>[] {
  const normalizedQuery = (options.query ?? '').trim().toLowerCase()
  const activeCat = options.categorySlug && options.categorySlug !== 'all' ? options.categorySlug : null
  const onlyPurchasable = Boolean(options.onlyPurchasable)

  const result: ShopFilterCategory<T>[] = []
  for (const cat of categories) {
    if (activeCat && cat.slug !== activeCat) continue

    const matchedProducts = cat.products.filter((p) => {
      if (onlyPurchasable && !p.purchasable) return false
      if (!normalizedQuery) return true
      const haystack = [p.nameFa, p.nameEn ?? '', p.description, cat.nameFa, cat.nameEn ?? '']
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })

    if (matchedProducts.length > 0) {
      result.push({ ...cat, products: matchedProducts })
    }
  }
  return result
}

/**
 * Builds factual, non-fabricated buyer FAQ items grounded solely in real
 * MR.ROBOT checkout, tracking, fulfillment, and support capabilities.
 */
export function buildProductFaqItems(input: {
  productName: string
  categoryName?: string | null
  hasMultiplePlans: boolean
  planInstructions?: string[]
  supportHours?: string | null
}): ProductFaqItem[] {
  const cleanInstructions = (input.planInstructions ?? [])
    .map((s) => s.trim())
    .filter(Boolean)

  const items: ProductFaqItem[] = [
    {
      id: 'what-you-get',
      question: `با خرید «${input.productName}» دقیقاً چه چیزی دریافت می‌کنم؟`,
      answer: input.categoryName
        ? `این محصول یک سرویس دیجیتال در دسته‌بندی «${input.categoryName}» است. پس از ثبت سفارش و تأیید پرداخت، اطلاعات تحویل یا فایل‌های مربوط به سفارش شما در حساب کاربری و صفحه پیگیری اختصاصی سفارش در دسترس قرار می‌گیرد.`
        : `این محصول یک سرویس دیجیتال است. پس از ثبت سفارش و تأیید پرداخت، اطلاعات تحویل و راهنمای استفاده در حساب کاربری و صفحه پیگیری اختصاصی سفارش ثبت می‌شود.`,
    },
    {
      id: 'delivery-activation',
      question: 'تحویل و فعال‌سازی سفارش چگونه انجام می‌شود؟',
      answer:
        cleanInstructions.length > 0
          ? `توضیحات تحویل ثبت‌شده برای طرح‌های این محصول: ${cleanInstructions.join(' | ')} — وضعیت تحویل در هر مرحله از طریق صفحه پیگیری سفارش قابل مشاهده است.`
          : 'پس از ثبت سفارش و تأیید پرداخت، تیم MR.ROBOT فرآیند آماده‌سازی و تحویل دیجیتال را انجام می‌دهد و جزئیات فعال‌سازی در بخش سفارش‌های حساب کاربری و لینک پیگیری سفارش نمایش داده می‌شود.',
    },
    {
      id: 'tracking',
      question: 'چگونه می‌توانم وضعیت سفارش خود را پیگیری کنم؟',
      answer:
        'بلافاصله پس از ثبت سفارش، یک شماره پیگیری یکتا و لینک اختصاصی پیگیری به شما نمایش داده می‌شود. اگر با حساب کاربری وارد شده باشید، تمام سفارش‌ها و فایل‌های تحویلی همیشه در بخش «سفارش‌های من» ذخیره می‌شوند.',
    },
    {
      id: 'support',
      question: 'اگر قبل یا بعد از خرید سوال یا مشکلی داشتم چگونه پشتیبانی بگیرم؟',
      answer: input.supportHours?.trim()
        ? `از طریق صفحه تماس با ما و ثبت تیکت پشتیبانی می‌توانید با شماره سفارش خود با تیم MR.ROBOT در ارتباط باشید. ساعات پاسخ‌گویی اعلام‌شده: ${input.supportHours.trim()}.`
        : 'از طریق صفحه تماس با ما و ثبت تیکت پشتیبانی می‌توانید با اعلام شماره سفارش خود مستقیماً با تیم پشتیبانی MR.ROBOT در ارتباط باشید.',
    },
  ]

  if (input.hasMultiplePlans) {
    items.splice(1, 0, {
      id: 'plan-choice',
      question: 'تفاوت طرح‌های موجود در این محصول چیست؟',
      answer:
        'مدت اعتبار، قیمت و توضیحات هر طرح در کادر «انتخاب طرح و سفارش» به‌صورت شفاف درج شده است. با انتخاب هر طرح، مبلغ نهایی قبل از ثبت سفارش به‌روزرسانی می‌شود و در سرور نیز مجدداً بررسی می‌گردد.',
    })
  }

  return items
}
