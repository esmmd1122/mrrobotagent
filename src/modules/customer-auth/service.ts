import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import {
  createCustomerSessionToken,
  setCustomerSessionCookie,
  clearCustomerSessionCookie,
} from '@/lib/customer-auth/session'
import {
  CUSTOMER_LOGIN_GENERIC_ERROR,
  CUSTOMER_REGISTER_GENERIC_ERROR,
} from '@/lib/customer-auth/constants'
import { rateLimit } from '@/lib/rate-limit'

const DUMMY_HASH = '$2b$04$tuplTm3jIVcRaXnVspdmoOmghfNx2uXrIjwIe5Ejn9XvbI51DmKs6'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function registerCustomer(input: {
  name: string
  email: string
  password: string
  ip: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!rateLimit(`cust-reg:${input.ip}`, 10, 15 * 60 * 1000)) {
    return { ok: false, error: CUSTOMER_REGISTER_GENERIC_ERROR }
  }
  const email = normalizeEmail(input.email)
  const name = input.name.trim()
  if (name.length < 2 || input.password.length < 8) {
    return { ok: false, error: CUSTOMER_REGISTER_GENERIC_ERROR }
  }

  const existing = await prisma.customer.findFirst({ where: { email } })
  if (existing?.passwordHash) {
    return { ok: false, error: CUSTOMER_REGISTER_GENERIC_ERROR }
  }
  if (existing?.status && existing.status !== 'ACTIVE') {
    return { ok: false, error: CUSTOMER_REGISTER_GENERIC_ERROR }
  }

  const passwordHash = await hashPassword(input.password)

  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: { name, email, passwordHash, status: 'ACTIVE' },
      })
    : await prisma.customer.create({
        data: { name, email, passwordHash, status: 'ACTIVE' },
      })

  const token = await createCustomerSessionToken({
    sub: customer.id,
    email: customer.email,
    name: customer.name,
  })
  await setCustomerSessionCookie(token)
  await prisma.customer.update({
    where: { id: customer.id },
    data: { lastLoginAt: new Date() },
  })

  return { ok: true }
}

export async function loginCustomer(input: {
  email: string
  password: string
  ip: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!rateLimit(`cust-login:${input.ip}`, 20, 15 * 60 * 1000)) {
    return { ok: false, error: CUSTOMER_LOGIN_GENERIC_ERROR }
  }
  const email = normalizeEmail(input.email)
  const customer = await prisma.customer.findFirst({ where: { email } })

  const hash = customer?.passwordHash || DUMMY_HASH
  const valid = await verifyPassword(input.password, hash)

  if (!customer || !customer.passwordHash || !valid || customer.status !== 'ACTIVE') {
    return { ok: false, error: CUSTOMER_LOGIN_GENERIC_ERROR }
  }

  const token = await createCustomerSessionToken({
    sub: customer.id,
    email: customer.email,
    name: customer.name,
  })
  await setCustomerSessionCookie(token)
  await prisma.customer.update({
    where: { id: customer.id },
    data: { lastLoginAt: new Date() },
  })

  return { ok: true }
}

export async function logoutCustomer() {
  await clearCustomerSessionCookie()
}

/** Constant-time email compare helper for tests */
export function emailsEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function updateCustomerProfile(
  customerId: string,
  input: { name: string; phone: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (name.length < 2) return { ok: false, error: 'نام نامعتبر است.' }
  const phone = input.phone?.trim() || null

  await prisma.customer.update({
    where: { id: customerId },
    data: { name, phone },
  })
  return { ok: true }
}