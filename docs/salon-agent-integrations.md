# Adding a salon AI provider

1. Implement `AIProvider` in `src/modules/salon/ai/providers/`.
2. Register the provider id in `SalonAiProvider.provider` and in `src/app/studio/(panel)/agent/connections/page.tsx` (`PROVIDERS` list).
3. Wire credential decryption in `src/modules/salon/ai/credentials.ts` (`resolveAgentProvider`).
4. Add `validateCredentials()` that performs a minimal real API call — never return success without HTTP 2xx from the provider.
5. Tool execution must go through `executeAgentTool()` in `src/modules/salon/ai/tools.ts` so tenant `businessId` is always enforced.
6. Do not expose API keys to the client; store via `encryptSecret()` in `src/lib/secrets-at-rest.ts` (key derived from `AUTH_SECRET`).

Runtime entry point: `runAgentTurn()` in `src/modules/salon/ai/agent.ts`.
