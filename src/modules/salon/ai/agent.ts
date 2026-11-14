import { prisma } from '@/lib/db'
import { AGENT_TOOLS } from './tool-definitions'
import { executeAgentTool, parseAllowedActions } from './tools'
import { resolveAgentProvider } from './credentials'
import { getAgentRuntimeStatus } from './agent-status'
import type { AgentTurnInput, AgentTurnResult } from './types'
import { rulesProvider } from './providers/rules'

async function ensureConfig(businessId: string) {
  return prisma.salonAgentConfig.upsert({
    where: { businessId },
    create: { businessId },
    update: {},
  })
}

async function ensureConversation(input: AgentTurnInput) {
  if (input.conversationId) {
    const existing = await prisma.salonAgentConversation.findFirst({
      where: { id: input.conversationId, businessId: input.businessId },
    })
    if (existing) return existing.id
  }
  const created = await prisma.salonAgentConversation.create({
    data: {
      businessId: input.businessId,
      channel: input.channel,
      guestPhone: input.guestPhone || null,
    },
  })
  return created.id
}

export async function runAgentTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
  const config = await ensureConfig(input.businessId)
  const runtime = await getAgentRuntimeStatus(input.businessId)
  const conversationId = await ensureConversation(input)

  await prisma.salonAgentMessage.create({
    data: { conversationId, role: 'user', content: input.message },
  })

  if (!config.enabled) {
    const text = 'دستیار این سالن هنوز فعال نشده است. لطفاً با سالن تماس بگیرید.'
    await prisma.salonAgentMessage.create({
      data: { conversationId, role: 'assistant', content: text, meta: JSON.stringify({ provider: 'none' }) },
    })
    return {
      text,
      provider: 'none',
      tokens: 0,
      conversationId,
      connection: runtime.connection,
    }
  }

  const allowed = parseAllowedActions(config.allowedActions)
  const toolCtx = {
    businessId: input.businessId,
    conversationId,
    guestPhone: input.guestPhone || null,
    guestVerified: input.guestVerified,
    allowed,
  }

  const resolved = await resolveAgentProvider(input.businessId)
  const useProvider =
    runtime.connection.state === 'connected' || (resolved.providerId !== 'rules' && resolved.credentialPresent)
      ? resolved.provider
      : rulesProvider

  const system = buildSystemPrompt(config, input.guestVerified)

  const onToolCall = (name: string, args: Record<string, unknown>) =>
    executeAgentTool(name, args, toolCtx)

  let text = ''
  let tokens = 0
  let providerName = resolved.providerId

  try {
    const out = await useProvider.generateResponse({
      system,
      user: input.message,
      tools: AGENT_TOOLS,
      onToolCall,
    })
    text = out.text
    tokens = out.tokens
  } catch (error) {
    const fallback = await rulesProvider.generateResponse({
      system,
      user: input.message,
      tools: AGENT_TOOLS,
      onToolCall,
    })
    text = `${fallback.text}\n\n(خطای ارائه‌دهنده: ${error instanceof Error ? error.message : 'نامشخص'})`
    providerName = 'rules'
  }

  await prisma.salonAgentMessage.create({
    data: {
      conversationId,
      role: 'assistant',
      content: text,
      meta: JSON.stringify({ provider: providerName, tokens }),
    },
  })

  await prisma.salonAiUsage.create({
    data: { businessId: input.businessId, provider: providerName, tokens },
  })

  await prisma.salonAgentConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  })

  const status = await getAgentRuntimeStatus(input.businessId)

  return {
    text,
    provider: providerName,
    tokens,
    conversationId,
    connection: status.connection,
  }
}

function buildSystemPrompt(
  config: { displayName: string; tone: string; language: string; instructions: string; welcomeMessage: string },
  guestVerified: boolean,
) {
  const lines = [
    `You are ${config.displayName}, a salon receptionist. Language: ${config.language}. Tone: ${config.tone}.`,
    'Answer in Persian unless asked otherwise.',
    'Use tools for all factual data. Never invent prices, staff, or slots.',
    'For book/cancel/reschedule: always call prepare* first, show summary, get explicit customer confirmation, then confirm*.',
    'Never say a booking was created unless confirmBooking returns ok:true.',
    guestVerified
      ? 'Customer phone is verified; booking tools may run after confirmation.'
      : 'Customer phone is NOT verified; tell them to verify OTP before booking operations.',
    config.instructions ? `Owner instructions: ${config.instructions}` : '',
    config.welcomeMessage ? `Welcome hint: ${config.welcomeMessage}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

export { getAgentRuntimeStatus }
