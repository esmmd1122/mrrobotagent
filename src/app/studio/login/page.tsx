'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import '@/app/admin/admin.css'

export default function StudioLoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/studio/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
        slug: form.get('slug'),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'ورود ناموفق بود')
      return
    }
    router.push('/studio')
  }

  return (
    <main className="mr-studio flex min-h-screen items-center justify-center px-4">
      <div className="admin-card w-full max-w-md p-6">
        <img src="/images/mr-robot-character.png" alt="" className="mb-4 h-16 w-16 object-contain" />
        <p className="mr-kicker">MR.ROBOT AI</p>
        <h1 className="mt-2">ورود به پنل سالن</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="ایمیل" />
          <input name="password" type="password" required placeholder="رمز" />
          <input name="slug" placeholder="شناسه سالن (اگر چند کسب‌وکار دارید)" />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="w-full bg-[#E32636] py-2">ورود</button>
        </form>
        <a href="/studio/register" className="mt-4 inline-block text-sm text-[#9297A3]">ثبت سالن جدید</a>
      </div>
    </main>
  )
}
