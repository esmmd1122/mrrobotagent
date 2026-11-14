import { cookies } from 'next/headers'
import { z } from 'zod'
import { CART_COOKIE } from './constants'
import type { CartLineInput } from './types'

const lineSchema = z.object({
  productId: z.string().uuid(),
  planId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).max(99),
})

const cartSchema = z.array(lineSchema).max(50)

function parseCart(raw: string | undefined): CartLineInput[] {
  if (!raw) return []
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

export async function readCart(): Promise<CartLineInput[]> {
  const jar = await cookies()
  return parseCart(jar.get(CART_COOKIE)?.value)
}

export async function writeCart(lines: CartLineInput[]) {
  const jar = await cookies()
  const normalized = cartSchema.safeParse(lines)
  if (!normalized.success) {
    jar.delete(CART_COOKIE)
    return
  }
  jar.set(CART_COOKIE, JSON.stringify(normalized.data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  })
}

export async function clearCart() {
  const jar = await cookies()
  jar.delete(CART_COOKIE)
}

export async function getCartItemCount(): Promise<number> {
  const lines = await readCart()
  return lines.reduce((s, l) => s + l.quantity, 0)
}