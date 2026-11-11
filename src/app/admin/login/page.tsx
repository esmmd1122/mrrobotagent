'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'خطا در ورود')
      return
    }
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center p-4" dir="rtl">
      <LoginBackdrop />
      <form onSubmit={onSubmit} className="admin-card w-full max-w-md p-8">
        <p className="text-xs tracking-widest text-[#e10600]">SECURE ACCESS</p>
        <h1 className="mt-2 text-2xl font-bold" dir="ltr">
          MR.ROBOT Admin
        </h1>
        <p className="mt-2 text-sm text-white/55">ورود مدیران سیستم</p>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <label className="mt-6 block text-sm text-white/70">
          ایمیل
          <input
            className="admin-input mt-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className="mt-4 block text-sm text-white/70">
          رمز عبور
          <input
            className="admin-input mt-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-[#e10600] py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'در حال ورود…' : 'ورود امن'}
        </button>

        <p className="mt-4 text-xs text-white/40">
          حساب اولیه با `npx prisma db seed` و متغیرهای ADMIN_SEED_* ساخته می‌شود.
        </p>
      </form>
    </div>
  )
}

function LoginBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(225,6,0,0.12),transparent_45%)]"
      aria-hidden
    />
  )
}
