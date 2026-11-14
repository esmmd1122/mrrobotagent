import { prisma } from '@/lib/db'
import { isPaymentSandboxAllowed } from './environment'
import { createSandboxProvider } from './providers/sandbox'
import { createZarinpalProvider } from './providers/zarinpal'
import type { PaymentProvider, PaymentProviderId } from './types'

export async function resolvePaymentProvider(
  providerId: PaymentProviderId,
  appOrigin: string,
): Promise<PaymentProvider> {
  if (providerId === 'sandbox') {
    return createSandboxProvider(appOrigin)
  }
  const row = await prisma.paymentGatewayConfig.findUnique({ where: { provider: providerId } })
  return createZarinpalProvider(row?.settings ?? '{}')
}

export async function selectEnabledProvider(appOrigin: string): Promise<{
  providerId: PaymentProviderId
  provider: PaymentProvider
} | null> {
  const configs = await prisma.paymentGatewayConfig.findMany({
    where: { isEnabled: true },
    orderBy: { updatedAt: 'desc' },
  })

  for (const cfg of configs) {
    if (cfg.provider === 'sandbox') {
      if (!isPaymentSandboxAllowed()) continue
      return { providerId: 'sandbox', provider: createSandboxProvider(appOrigin) }
    }
    if (cfg.provider === 'zarinpal') {
      return { providerId: 'zarinpal', provider: createZarinpalProvider(cfg.settings) }
    }
  }
  return null
}