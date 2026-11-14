'use client'

import { useRouter } from 'next/navigation'

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter()

  async function mark() {
    await fetch(`/api/store/account/notifications/${notificationId}/read`, { method: 'POST' })
    router.refresh()
  }

  return (
    <button type="button" onClick={mark} className="shrink-0 text-xs text-mr-red">
      خواندم
    </button>
  )
}