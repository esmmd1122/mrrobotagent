'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StudioRegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/studio/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'ثبت ناموفق بود')
      return
    }
    router.push('/studio')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 text-white">
      <p className="text-xs tracking-widest text-[#e10600]">Created by MR.ROBOT AI</p>
      <h1 className="mt-2 text-2xl font-semibold">ساخت سالن</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input name="salonName" required placeholder="نام سالن" className="rounded-lg bg-white/5 px-3 py-2" />
        <input name="slug" required placeholder="شناسه انگلیسی مثل liana-salon" className="rounded-lg bg-white/5 px-3 py-2" dir="ltr" />
        <select name="category" className="rounded-lg bg-zinc-900 px-3 py-2">
          <option value="HAIR_SALON">سالن مو</option>
          <option value="BEAUTY_SALON">سالن زیبایی</option>
          <option value="BARBER">آرایشگاه مردانه</option>
          <option value="NAIL">ناخن</option>
          <option value="SPA">اسپا</option>
          <option value="CLINIC">کلینیک زیبایی</option>
        </select>
        <input name="ownerName" required placeholder="نام شما" className="rounded-lg bg-white/5 px-3 py-2" />
        <input name="email" type="email" required placeholder="ایمیل" className="rounded-lg bg-white/5 px-3 py-2" />
        <input name="password" type="password" required minLength={8} placeholder="رمز عبور" className="rounded-lg bg-white/5 px-3 py-2" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="rounded-lg bg-[#e10600] py-2">ادامه راه‌اندازی</button>
      </form>
    </main>
  )
}
