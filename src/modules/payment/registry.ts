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

export type PaymentGatewayAvailability = {
  available: boolean
  providerId: PaymentProviderId | null
}

/**
 * Checks if any enabled payment gateway is currently usable for online redirects.
 * Sandbox is strictly blocked in production; Zarinpal requires live API integration + credentials.
 */
export async function getPaymentGatewayAvailability(): Promise<PaymentGatewayAvailability> {
  const configs = await prisma.paymentGatewayConfig.findMany({
    where: { isEnabled: true },
    orderBy: { updatedAt: 'desc' },
  })

  for (const cfg of configs) {
    if (cfg.provider === 'sandbox' && isPaymentSandboxAllowed()) {
      return { available: true, providerId: 'sandbox' }
    }
    // Zarinpal provider is preserved as architecture-ready; live API is not yet enabled.
  }

  return { available: false, providerId: null }
}