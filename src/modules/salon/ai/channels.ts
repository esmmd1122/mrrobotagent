/** Communication channel adapters — reasoning/tools stay in `agent.ts`; channels only deliver messages */

export type ChannelKind = 'website' | 'telegram' | 'voice' | 'phone'

export type ChannelMessage = {
  channel: ChannelKind
  businessId: string
  guestPhone?: string | null
  guestVerified: boolean
  text: string
  conversationId?: string
}

export const CHANNEL_STATUS: Record<ChannelKind, { implemented: boolean; note: string }> = {
  website: { implemented: true, note: 'چت در صفحه رزرو عمومی' },
  telegram: { implemented: false, note: 'مینی‌اپ تلگرام — آماده معماری، پیاده‌سازی نشده' },
  voice: { implemented: false, note: 'WebRTC — بدون UI جعلی' },
  phone: { implemented: false, note: 'تماس تلفنی — نیاز به سرویس خارجی' },
}
