import { redirect } from 'next/navigation'
import { getCustomerSession, type CustomerSessionPayload } from './session'

export async function requireCustomer(): Promise<CustomerSessionPayload> {
  const session = await getCustomerSession()
  if (!session) redirect('/account/login')
  return session
}

export async function getCustomerOrNull() {
  return getCustomerSession()
}