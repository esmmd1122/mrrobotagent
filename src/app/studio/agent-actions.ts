'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { encryptSecret } from '@/lib/secrets-at-rest'
import { getStudioSession } from '@/modules/salon/auth'
import { geminiProviderWithKey } from '@/modules/salon/ai/providers/gemini'
import { openAiCompatProvider } from '@/modules/salon/ai/providers/openai-compat'

async function currentBusinessId() {
  const session = await getStudioSession()
  if (!session) throw new Error('ورود لازم است')
  return session.businessId
}

export async function saveAgentConfig(formData: FormData) {
  const businessId = await currentBusinessId()
  const enabled = formData.get('enabled') === 'on'
  const allowed = {
    faq: formData.get('faq') === 'on',
    services: formData.get('services') === 'on',
    slots: formData.get('slots') === 'on',
    appointments: formData.get('appointments') === 'on',
    book: formData.get('book') === 'on',
    reschedule: formData.get('reschedule') === 'on',
    cancel: formData.get('cancel') === 'on',
  }
  await prisma.salonAgentConfig.upsert({
    where: { businessId },
    create: {
      businessId,
      enabled,
      displayName: String(formData.get('displayName') || 'دستیار سالن'),
      language: String(formData.get('language') || 'fa'),
      tone: String(formData.get('tone') || 'friendly'),
      welcomeMessage: String(formData.get('welcomeMessage') || ''),
      instructions: String(formData.get('instructions') || ''),
      escalationRules: String(formData.get('escalationRules') || '{}'),
      allowedActions: JSON.stringify(allowed),
    },
    update: {
      enabled,
      displayName: String(formData.get('displayName') || 'دستیار سالن'),
      language: String(formData.get('language') || 'fa'),
      tone: String(formData.get('tone') || 'friendly'),
      welcomeMessage: String(formData.get('welcomeMessage') || ''),
      instructions: String(formData.get('instructions') || ''),
      escalationRules: String(formData.get('escalationRules') || '{}'),
      allowedActions: JSON.stringify(allowed),
    },
  })
  revalidatePath('/studio/agent')
  revalidatePath('/studio/agent/connections')
}

export async function addAgentFaq(formData: FormData) {
  const businessId = await currentBusinessId()
  await prisma.salonAgentFaq.create({
    data: {
      businessId,
      question: String(formData.get('question') || '').trim(),
      answer: String(formData.get('answer') || '').trim(),
    },
  })
  revalidatePath('/studio/agent')
}

export async function removeAgentFaq(formData: FormData) {
  const businessId = await currentBusinessId()
  const id = String(formData.get('id') || '')
  await prisma.salonAgentFaq.deleteMany({ where: { id, businessId } })
  revalidatePath('/studio/agent')
}

export async function saveAiProvider(formData: FormData) {
  const businessId = await currentBusinessId()
  const provider = String(formData.get('provider') || '')
  const apiKey = String(formData.get('apiKey') || '').trim()
  const model = String(formData.get('model') || '').trim() || null
  const baseUrl = String(formData.get('baseUrl') || '').trim() || null
  const enabled = formData.get('enabled') === 'on'
  const active = formData.get('activeForAgent') === 'on'
  const existing = await prisma.salonAiProvider.findUnique({
    where: { businessId_provider: { businessId, provider } },
  })
  const enc = apiKey ? encryptSecret(apiKey) : null
  if (active) {
    await prisma.salonAiProvider.updateMany({
      where: { businessId },
      data: { activeForAgent: false },
    })
  }
  await prisma.salonAiProvider.upsert({
    where: { businessId_provider: { businessId, provider } },
    create: {
      businessId,
      provider,
      enabled,
      activeForAgent: active,
      model,
      baseUrl,
      secretCiphertext: enc?.ciphertext || '',
      secretIv: enc?.iv || '',
      secretTag: enc?.tag || '',
    },
    update: {
      enabled,
      activeForAgent: active,
      model,
      baseUrl,
      ...(enc
        ? {
            secretCiphertext: enc.ciphertext,
            secretIv: enc.iv,
            secretTag: enc.tag,
          }
        : {}),
    },
  })
  if (!apiKey && !existing?.secretCiphertext) {
    throw new Error('کلید API لازم است')
  }
  revalidatePath('/studio/agent/connections')
  revalidatePath('/studio/agent')
}

export async function testAiProvider(formData: FormData) {
  const businessId = await currentBusinessId()
  const provider = String(formData.get('provider') || '')
  const row = await prisma.salonAiProvider.findUnique({
    where: { businessId_provider: { businessId, provider } },
  })
  if (!row?.secretCiphertext) {
    return { ok: false, error: 'ابتدا کلید را ذخیره کنید' }
  }
  const { decryptSecret } = await import('@/lib/secrets-at-rest')
  const apiKey = decryptSecret(row.secretCiphertext, row.secretIv, row.secretTag)
  const engine =
    provider === 'gemini'
      ? geminiProviderWithKey(apiKey, row.model)
      : openAiCompatProvider(apiKey, row.baseUrl || 'https://api.openai.com/v1', row.model)
  const result = await engine.validateCredentials({
    apiKey,
    model: row.model,
    baseUrl: row.baseUrl,
  })
  await prisma.salonAiProvider.update({
    where: { id: row.id },
    data: {
      lastTestAt: new Date(),
      lastTestOk: result.ok,
      lastError: result.error || '',
    },
  })
  revalidatePath('/studio/agent/connections')
  return result
}
