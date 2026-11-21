import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readCart } from '@/modules/commerce/cart-cookie'
import { calculateCartPricing, priceCartLines } from '@/modules/commerce/pricing'
import { validateDiscountCode } from '@/modules/commerce/discount'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  code: z.string().trim().min(1).max(32),
  singleItem: z
    .object({
      productId: z.string().uuid(),
      planId: z.string().uuid().optional().nullable(),
      quantity: z.number().int().min(1).max(99).optional().default(1),
    })
    .optional(),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'کد تخفیف واردشده نامعتبر است.' }, { status: 400 })
    }

    const lines = parsed.data.singleItem
      ? [
          {
            productId: parsed.data.singleItem.productId,
            planId: parsed.data.singleItem.planId ?? null,
            quantity: parsed.data.singleItem.quantity,
          },
        ]
      : await readCart()

    if (lines.length === 0) {
      return NextResponse.json({ ok: false, error: 'سبد خرید خالی است.' }, { status: 400 })
    }

    const pricedLines = await priceCartLines(lines)
    const subtotal = pricedLines.reduce((s, l) => s + l.lineTotal, 0)
    if (subtotal <= 0) {
      return NextResponse.json({ ok: false, error: 'مبلغ سفارش برای اعمال تخفیف معتبر نیست.' }, { status: 400 })
    }

    const discount = await validateDiscountCode(parsed.data.code, pricedLines, subtotal)
    if (!discount.code) {
      return NextResponse.json(
        { ok: false, error: discount.error || 'کد تخفیف معتبر نیست.' },
        { status: 400 },
      )
    }

    const pricing = await calculateCartPricing(lines, discount.code)
    return NextResponse.json(
      {
        ok: true,
        code: pricing.discountCode,
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        total: pricing.total,
        currency: pricing.currency,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ ok: false, error: 'خطا در بررسی کد تخفیف.' }, { status: 500 })
  }
}
