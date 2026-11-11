import { redirect } from 'next/navigation'
import { getSession, hasPermission } from './session'
import type { Permission } from './constants'

export async function requireAdmin(permission?: Permission) {
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }
  if (permission && !hasPermission(session, permission)) {
    redirect('/admin?denied=1')
  }
  return session
}

export async function requireAdminApi(permission?: Permission) {
  const session = await getSession()
  if (!session) {
    return { error: 'UNAUTHORIZED' as const, session: null }
  }
  if (permission && !hasPermission(session, permission)) {
    return { error: 'FORBIDDEN' as const, session }
  }
  return { error: null, session }
}
