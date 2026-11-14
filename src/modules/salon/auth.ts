import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { GUEST_COOKIE, STUDIO_COOKIE } from './cookies'

export { GUEST_COOKIE, STUDIO_COOKIE }

export type StudioPayload = {
  sub: string
  businessId: string
  role: string
  name: string
  email: string
  employeeId?: string | null
}

export type GuestPayload = {
  phone: string
  businessId: string
}

function secret() {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET is missing or too short')
  }
  return new TextEncoder().encode(value)
}

export async function signStudio(payload: StudioPayload) {
  return new SignJWT({ ...payload, kind: 'studio' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret())
}

export async function signGuest(payload: GuestPayload) {
  return new SignJWT({ ...payload, kind: 'guest' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret())
}

async function readCookie(name: string) {
  const jar = await cookies()
  return jar.get(name)?.value || null
}

export async function getStudioSession(): Promise<StudioPayload | null> {
  const token = await readCookie(STUDIO_COOKIE)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    if (payload.kind !== 'studio') return null
    const membership = await prisma.salonMembership.findUnique({
      where: { id: String(payload.sub) },
    })
    if (!membership || !membership.isActive) return null
    if (membership.businessId !== payload.businessId) return null
    return {
      sub: membership.id,
      businessId: membership.businessId,
      role: membership.role,
      name: membership.name,
      email: membership.email,
      employeeId: membership.employeeId,
    }
  } catch {
    return null
  }
}

export async function getGuestSession(): Promise<GuestPayload | null> {
  const token = await readCookie(GUEST_COOKIE)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    if (payload.kind !== 'guest') return null
    return {
      phone: String(payload.phone),
      businessId: String(payload.businessId),
    }
  } catch {
    return null
  }
}

export async function setStudioCookie(token: string) {
  const jar = await cookies()
  jar.set(STUDIO_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
}

export async function clearStudioCookie() {
  const jar = await cookies()
  jar.delete(STUDIO_COOKIE)
}

export async function setGuestCookie(token: string) {
  const jar = await cookies()
  jar.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 2,
  })
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function canManage(role: string) {
  return role === 'OWNER' || role === 'MANAGER'
}
