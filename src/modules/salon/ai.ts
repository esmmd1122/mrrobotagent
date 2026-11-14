import { runAgentTurn, getAgentRuntimeStatus } from './ai/agent'
import type { AiChannel } from './ai/types'

export type { AiChannel, AgentConnectionState, ProviderStatus } from './ai/types'
export { getAgentRuntimeStatus }

export function assertTextChannel(channel: AiChannel) {
  if (channel !== 'text') {
    throw new Error('کانال صوتی در این نسخه فعال نیست')
  }
}

/** @deprecated use runAgentTurn */
export async function receptionistReply(input: {
  businessId: string
  message: string
  channel?: AiChannel
  conversationId?: string
  guestPhone?: string | null
  guestVerified?: boolean
}) {
  assertTextChannel((input.channel === 'text' ? 'website' : input.channel) as AiChannel)
  const turn = await runAgentTurn({
    businessId: input.businessId,
    message: input.message,
    channel: 'website',
    conversationId: input.conversationId,
    guestPhone: input.guestPhone,
    guestVerified: input.guestVerified ?? false,
  })
  return {
    provider: turn.provider,
    text: turn.text,
    tokens: turn.tokens,
    conversationId: turn.conversationId,
    connection: turn.connection,
  }
}
