import { prisma } from '@/lib/db'
import { decryptSecret } from '@/lib/secrets-at-rest'
import { geminiProviderWithKey } from './providers/gemini'
import { openAiCompatProvider } from './providers/openai-compat'
import { rulesProvider } from './providers/rules'
import type { AIProvider, AiProviderId } from './types'

export async function resolveAgentProvider(businessId: string): Promise<{
  provider: AIProvider
  providerId: AiProviderId
  rowId: string | null
  credentialPresent: boolean
  lastTestOk: boolean
  lastError: string
  lastTestAt: Date | null
}> {
  const active = await prisma.salonAiProvider.findFirst({
    where: { businessId, activeForAgent: true, enabled: true },
    orderBy: { updatedAt: 'desc' },
  })
  if (active?.secretCiphertext) {
    const apiKey = decryptSecret(active.secretCiphertext, active.secretIv, active.secretTag)
    if (apiKey) {
      if (active.provider === 'gemini') {
        return {
          provider: geminiProviderWithKey(apiKey, active.model),
          providerId: 'gemini',
          rowId: active.id,
          credentialPresent: true,
          lastTestOk: active.lastTestOk,
          lastError: active.lastError,
          lastTestAt: active.lastTestAt,
        }
      }
      if (active.provider === 'openai_compat') {
        const base = active.baseUrl || 'https://api.openai.com/v1'
        return {
          provider: openAiCompatProvider(apiKey, base, active.model),
          providerId: 'openai_compat',
          rowId: active.id,
          credentialPresent: true,
          lastTestOk: active.lastTestOk,
          lastError: active.lastError,
          lastTestAt: active.lastTestAt,
        }
      }
    }
  }

  const envGemini = process.env.GEMINI_API_KEY
  if (envGemini && process.env.NODE_ENV !== 'production') {
    return {
      provider: geminiProviderWithKey(envGemini, process.env.GEMINI_MODEL || null),
      providerId: 'gemini',
      rowId: null,
      credentialPresent: true,
      lastTestOk: true,
      lastError: '',
      lastTestAt: null,
    }
  }

  return {
    provider: rulesProvider,
    providerId: 'rules',
    rowId: null,
    credentialPresent: false,
    lastTestOk: false,
    lastError: '',
    lastTestAt: null,
  }
}

export async function getProviderRows(businessId: string) {
  return prisma.salonAiProvider.findMany({
    where: { businessId },
    orderBy: { provider: 'asc' },
    select: {
      id: true,
      provider: true,
      enabled: true,
      activeForAgent: true,
      model: true,
      baseUrl: true,
      lastTestAt: true,
      lastTestOk: true,
      lastError: true,
      secretCiphertext: true,
      updatedAt: true,
    },
  })
}
