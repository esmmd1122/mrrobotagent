'use client'

import { useRouter } from 'next/navigation'

export function AdminHeader({
  name,
  email,
}: {
  name: string
  email: string
}) {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header className="admin-card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-sm text-white/50">خوش آمدید</p>
        <p className="font-semibold">{name}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/45" dir="ltr">
          {email}
        </span>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-[#e10600]/50 bg-[#e10600]/15 px-4 py-2 text-sm font-medium text-white hover:bg-[#e10600]/25"
        >
          خروج
        </button>
      </div>
    </header>
  )
}
