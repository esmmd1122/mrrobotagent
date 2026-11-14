export type SmsOutbound = {
  to: string
  body: string
}

export type SmsSendResult =
  | { ok: true; provider: string; messageId?: string }
  | { ok: false; code: 'NOT_CONFIGURED' | 'ERROR'; reason: string }

/**
 * SMS provider interface — does not simulate successful delivery.
 */
export async function sendCustomerSms(message: SmsOutbound): Promise<SmsSendResult> {
  const provider = process.env.SMS_PROVIDER?.trim()
  if (!provider) {
    return { ok: false, code: 'NOT_CONFIGURED', reason: 'SMS_PROVIDER not set' }
  }
  return {
    ok: false,
    code: 'NOT_CONFIGURED',
    reason: `SMS provider ${provider} is not wired in this build`,
  }
}