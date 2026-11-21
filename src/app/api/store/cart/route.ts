import { NextResponse } from 'next/server'
import { readCart } from '@/modules/commerce/cart-cookie'
import { calculateCartPricing } from '@/modules/commerce/pricing'
import { STORE_CURRENCY_CODE } from '@/modules/commerce/money'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const lines = await readCart()
    const pricing = await calculateCartPricing(lines)
    const count = pricing.lines.reduce((sum, item) => sum + item.quantity, 0)
    return NextResponse.json(
      { count, pricing },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      {
        count: 0,
        pricing: {
          lines: [],
          subtotal: 0,
          discountAmount: 0,
          total: 0,
          discountCode: null,
          currency: STORE_CURRENCY_CODE,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
