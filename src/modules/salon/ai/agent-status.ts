import { prisma } from '@/lib/db'
import { resolveAgentProvider } from './credentials'
import type { AgentConnectionState, ProviderStatus } from './types'

export async function getAgentRuntimeStatus(businessId: string): Promise<{
  agentEnabled: boolean
  connection: ProviderStatus
}> {
  const config = await prisma.salonAgentConfig.findUnique({ where: { businessId } })
  const enabled = config?.enabled ?? false
  const resolved = await resolveAgentProvider(businessId)

  if (!enabled) {
    return {
      agentEnabled: false,
      connection: {
        state: 'disconnected',
        provider: null,
        message: 'ایجنت پذیرش غیرفعال است',
        lastTestAt: resolved.lastTestAt?.toISOString() || null,
        lastError: '',
      },
    }
  }

  let state: AgentConnectionState = 'disconnected'
  let message = ''

  if (resolved.providerId === 'rules' && !resolved.credentialPresent) {
    state = 'configuration_required'
    message = 'برای فعال‌سازی کامل، در «اتصال ایجنت‌ها» کلید API را وارد و تست کنید'
  } else if (resolved.rowId && !resolved.lastTestOk) {
    state = 'error'
    message = resolved.lastError || 'اتصال نیاز به تست مجدد دارد'
  } else if (resolved.credentialPresent && resolved.lastTestOk && resolved.rowId) {
    state = 'connected'
    message = `متصل به ${resolved.providerId}`
  } else {
    state = 'configuration_required'
    message = 'پیکربندی ارائه‌دهنده ناقص است'
  }

  return {
    agentEnabled: true,
    connection: {
      state,
      provider: resolved.providerId === 'rules' ? null : resolved.providerId,
      message,
      lastTestAt: resolved.lastTestAt?.toISOString() || null,
      lastError: resolved.lastError,
    },
  }
}
