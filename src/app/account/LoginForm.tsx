'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/store/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fd.get('email'),
        password: fd.get('password'),
      }),
    })
    setPending(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error || 'ورود ناموفق بود.')
      return
    }
    router.push('/account')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="card-shop mt-4 space-y-3 p-4">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <input
        name="email"
        type="email"
        required
        placeholder="ایمیل"
        className="w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2 text-sm"
        dir="ltr"
        autoComplete="email"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="رمز عبور"
        className="w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2 text-sm"
        autoComplete="current-password"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-mr-red py-2 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? '...' : 'ورود'}
      </button>
    </form>
  )
}