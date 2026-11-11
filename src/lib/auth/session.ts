import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { SESSION_COOKIE } from './constants'

export type SessionPayload = {
  sub: string
  email: string
  name: string
  roleSlug: string
  permissions: string[]
}

function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Set a 32+ char secret in .env',
    )
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getSecret())
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as SessionPayload & { exp: number; iat: number }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const payload = await verifySessionToken(token)
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      roleSlug: payload.roleSlug,
      permissions: payload.permissions,
    }
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export function hasPermission(
  session: SessionPayload | null,
  permission: string,
) {
  if (!session) return false
  if (session.roleSlug === 'super-admin') return true
  return session.permissions.includes(permission)
}
