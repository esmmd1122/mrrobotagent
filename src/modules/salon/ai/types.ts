export type AiChannel = 'text'

export type AgentConnectionState =
  | 'connected'
  | 'disconnected'
  | 'configuration_required'
  | 'error'

export type AiProviderId = 'gemini' | 'openai_compat' | 'rules'

export type AllowedActions = {
  faq?: boolean
  services?: boolean
  slots?: boolean
  appointments?: boolean
  book?: boolean
  reschedule?: boolean
  cancel?: boolean
}

export type ProviderStatus = {
  state: AgentConnectionState
  provider: AiProviderId | null
  message: string
  lastTestAt: string | null
  lastError: string
}

export type AgentTurnInput = {
  businessId: string
  message: string
  channel: 'website' | 'telegram' | 'voice' | 'phone'
  conversationId?: string
  guestPhone?: string | null
  guestVerified: boolean
}

export type AgentTurnResult = {
  text: string
  provider: string
  tokens: number
  conversationId: string
  connection: ProviderStatus
  pendingConfirmationId?: string
}

export type AIProvider = {
  id: AiProviderId
  generateResponse(input: {
    system: string
    user: string
    tools: ToolDefinition[]
    onToolCall: (name: string, args: Record<string, unknown>) => Promise<string>
  }): Promise<{ text: string; tokens: number }>
  streamResponse?(
    input: Parameters<AIProvider['generateResponse']>[0],
  ): AsyncGenerator<string>
  getProviderStatus(credentialPresent: boolean, lastTestOk: boolean, lastError: string): ProviderStatus
  validateCredentials(config: ProviderCredentialConfig): Promise<{ ok: boolean; error?: string }>
}

export type ProviderCredentialConfig = {
  apiKey: string
  model?: string | null
  baseUrl?: string | null
}

export type ToolDefinition = {
  name: string
  description: string
  parameters: Record<string, unknown>
}
