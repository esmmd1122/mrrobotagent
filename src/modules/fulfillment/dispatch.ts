import type { FULFILLMENT_TYPES } from '@/modules/commerce/constants'

export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number]

/** Future AI dispatch — not implemented in Phase 3. */
export type FulfillmentDispatchRequest = {
  orderId: string
  fulfillmentId: string
  type: FulfillmentType
}

export interface FulfillmentDispatcher {
  dispatch(request: FulfillmentDispatchRequest): Promise<{ accepted: boolean; message: string }>
}

/** Manual fulfillment is handled by admin UI + fulfillmentService; no auto dispatch. */
export const manualFulfillmentDispatcher: FulfillmentDispatcher = {
  async dispatch() {
    return { accepted: false, message: 'AUTOMATIC dispatch is not enabled.' }
  },
}