'use client'

import { useState } from 'react'
import { testAiProvider } from '@/app/studio/agent-actions'

export function ProviderTestButton({ provider }: { provider: string }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    setMsg('')
    const fd = new FormData()
    fd.set('provider', provider)
    try {
      const result = await testAiProvider(fd)
      setMsg(result.ok ? 'اتصال موفق بود' : result.error || 'خطا')
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'خطا')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={run} disabled={busy} className="rounded bg-white/10 px-3 py-1 text-sm">
        {busy ? 'در حال تست…' : 'تست اتصال'}
      </button>
      {msg && <span className="text-xs text-white/70">{msg}</span>}
    </div>
  )
}
