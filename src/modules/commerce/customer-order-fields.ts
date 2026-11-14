/** Scalar fields safe to expose in customer account and track views. */
export const customerSafeOrderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  fulfillmentStatus: true,
  subtotalAmount: true,
  discountAmount: true,
  totalAmount: true,
  currency: true,
  discountCode: true,
  deliveryInfo: true,
  createdAt: true,
  updatedAt: true,
} as const