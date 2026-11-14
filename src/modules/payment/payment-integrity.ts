/** Admin must not mark orders PAID without a verified gateway Payment row. */
export function validateAdminOrderPaymentUpdate(input: {
  nextPaymentStatus: string
  hasVerifiedPayment: boolean
}) {
  if (input.nextPaymentStatus === 'PAID' && !input.hasVerifiedPayment) {
    return {
      ok: false as const,
      message:
        'وضعیت پرداخت «PAID» فقط پس از تأیید درگاه (رکورد Payment با وضعیت VERIFIED) مجاز است.',
    }
  }
  return { ok: true as const }
}