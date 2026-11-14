/** Strips fields that must never appear in customer UI */
export function assertNoInternalFields(order: Record<string, unknown>) {
  const forbidden = ['adminNotes', 'internalNotes', 'assignedAdminId', 'customerViewTokenHash']
  for (const key of forbidden) {
    if (key in order && order[key] != null) {
      throw new Error(`INTERNAL_FIELD_LEAK:${key}`)
    }
  }
  const fulfillment = order.fulfillment as Record<string, unknown> | null | undefined
  if (fulfillment && 'internalNotes' in fulfillment && fulfillment.internalNotes != null) {
    throw new Error('INTERNAL_FIELD_LEAK:fulfillment.internalNotes')
  }
}