import { SignJWT, jwtVerify } from 'jose'
import { CUSTOMER_JWT_KIND } from './constants.ts'

export type CustomerSessionPayload = {
  sub: string
  email: string | null
  name: string
  kind: typeof CUSTOMER_JWT_KIND
}

function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET is missing or too short. Set a 32+ char secret in .env')
  }
  return new TextEncoder().encode(secret)
}

export async function createCustomerSessionToken(payload: Omit<CustomerSessionPayload, 'kind'>) {
  return new SignJWT({ ...payload, kind: CUSTOMER_JWT_KIND })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyCustomerSessionToken(token: string): Promise<CustomerSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const p = payload as unknown as CustomerSessionPayload & { kind?: string }
    if (p.kind !== CUSTOMER_JWT_KIND) return null
    return {
      sub: p.sub,
      email: p.email ?? null,
      name: p.name,
      kind: CUSTOMER_JWT_KIND,
    }
  } catch {
    return null
  }
}