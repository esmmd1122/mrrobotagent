import type { ReactElement } from 'react'
import type { AIService } from '@/data/aiServices'

export function ServiceIcon({ icon }: { icon: AIService['icon'] }) {
  const paths: Record<AIService['icon'], ReactElement> = {
    assistant: (
      <path
        d="M12 3a5 5 0 0 0-5 5v1H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2v-1a5 5 0 0 0-5-5zm-3 6a3 3 0 1 1 6 0v1H9V9z"
        fill="currentColor"
      />
    ),
    business: (
      <path
        d="M4 8h16v12H4V8zm2 2v2h4v-2H6zm6 0v2h6v-2h-6zM4 6l2-3h12l2 3H4z"
        fill="currentColor"
      />
    ),
    voice: (
      <path
        d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm-7-3h2a5 5 0 0 0 10 0h2a7 7 0 0 1-14 0zm3 3h2v4h-2v-4z"
        fill="currentColor"
      />
    ),
    booking: (
      <path
        d="M7 2v2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 8H5v8h14v-8z"
        fill="currentColor"
      />
    ),
    orders: (
      <path
        d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM8 13h8v2H8v-2zm0 4h5v2H8v-2z"
        fill="currentColor"
      />
    ),
    workflow: (
      <path
        d="M4 6h6v4H4V6zm10 0h6v4h-6V6zM4 14h6v4H4v-4zm10 0h6v4h-6v-4z"
        fill="currentColor"
      />
    ),
    telegram: (
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.2 7.3-1.6 7.6c-.12.54-.44.67-.9.42l-2.5-1.84-1.2 1.16c-.13.13-.24.24-.5.24l.18-2.56 4.64-4.2c.2-.18-.04-.28-.32-.1l-5.74 3.62-2.48-.78c-.54-.17-.55-.54.11-.8l9.7-3.74c.45-.17.85.1.7.62z"
        fill="currentColor"
      />
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7 text-mr-red"
      aria-hidden
    >
      {paths[icon]}
    </svg>
  )
}
