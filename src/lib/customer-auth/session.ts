import { cookies } from 'next/headers'
import { CUSTOMER_SESSION_COOKIE } from './constants'
import { customerSessionCookieOptions } from './cookie-options'
import { verifyCustomerSessionToken, type CustomerSessionPayload } from './session-token'

export type { CustomerSessionPayload } from './session-token'
export { createCustomerSessionToken, verifyCustomerSessionToken } from './session-token'

export async function getCustomerSession(): Promise<CustomerSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyCustomerSessionToken(token)
}

export async function setCustomerSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, customerSessionCookieOptions())
}

export async function clearCustomerSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(CUSTOMER_SESSION_COOKIE)
}