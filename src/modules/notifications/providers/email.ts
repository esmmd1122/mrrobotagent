export type EmailOutbound = {
  to: string
  subject: string
  text: string
}

export type EmailSendResult =
  | { ok: true; provider: string; messageId?: string }
  | { ok: false; code: 'NOT_CONFIGURED' | 'ERROR'; reason: string }

/**
 * Email provider interface — does not simulate successful delivery.
 * Configure via EMAIL_PROVIDER + provider credentials in production.
 */
export async function sendCustomerEmail(message: EmailOutbound): Promise<EmailSendResult> {
  const provider = process.env.EMAIL_PROVIDER?.trim()
  if (!provider) {
    return { ok: false, code: 'NOT_CONFIGURED', reason: 'EMAIL_PROVIDER not set' }
  }
  // Future: switch on provider (resend, ses, smtp, ...). No credentials = no send.
  return {
    ok: false,
    code: 'NOT_CONFIGURED',
    reason: `Email provider ${provider} is not wired in this build`,
  }
}