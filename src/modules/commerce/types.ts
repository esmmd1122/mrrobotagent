export type CartLineInput = {
  productId: string
  planId?: string | null
  quantity: number
}

export type PricedCartLine = {
  productId: string
  planId?: string | null
  slug: string
  productName: string
  planTitle?: string | null
  planDurationValue?: number | null
  planDurationUnit?: string | null
  planFulfillmentInstructions?: string | null
  /** Display label (product or product — plan) */
  name: string
  quantity: number
  listUnitPrice: number
  unitPrice: number
  lineTotal: number
  available: boolean
}

export type CartPricing = {
  lines: PricedCartLine[]
  subtotal: number
  discountAmount: number
  total: number
  discountCode: string | null
  currency: string
}