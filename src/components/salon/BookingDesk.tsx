'use client'

import { useEffect, useRef, useState } from 'react'
import { toman } from '@/modules/salon/format'

type Offering = {
  id: string
  name: string
  description: string
  priceToman: number
  durationMinutes: number
}
type Employee = { id: string; name: string }
type Slot = { employeeId: string; employeeName: string; start: string; label: string }
type Mine = {
  id: string
  reference: string
  status: string
  start: string
  service: string
  employee: string
  offeringId: string
  employeeId: string
}

const modes = [
  ['book', 'رزرو نوبت جدید'],
  ['change', 'تغییر نوبت'],
  ['cancel', 'لغو نوبت'],
  ['track', 'پیگیری نوبت'],
  ['ai', 'دستیار هوشمند'],
] as const

export function BookingDesk({
  slug,
  offerings,
  employees,
  accent,
  cancellationHours,
  theme = 'gold',
}: {
  slug: string
  offerings: Offering[]
  employees: Employee[]
  accent: string
  cancellationHours: number
  theme?: 'gold' | 'barber'
}) {
  const [mode, setMode] = useState<(typeof modes)[number][0]>('book')
  const [offeringId, setOfferingId] = useState(offerings[0]?.id || '')
  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState('')
  const dateRef = useRef<HTMLInputElement>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [verified, setVerified] = useState(false)
  const [mine, setMine] = useState<Mine[]>([])
  const [selected, setSelected] = useState('')
  const [aiInput, setAiInput] = useState('')
  const [aiLog, setAiLog] = useState<string[]>([])
  const [aiConversationId, setAiConversationId] = useState('')
  const [agentStatus, setAgentStatus] = useState<{
    state: string
    message: string
    displayName?: string
  } | null>(null)

  async function loadSlots(forOffering = offeringId, forEmployee = employeeId) {
    const chosenDate = dateRef.current?.value || date
    if (!chosenDate || !forOffering) return
    const q = new URLSearchParams({ offeringId: forOffering, date: chosenDate })
    if (forEmployee) q.set('employeeId', forEmployee)
    const res = await fetch(`/api/salon/${slug}/slots?${q}`)
    const data = await res.json()
    setSlots(data.slots || [])
  }

  async function sendOtp(purpose: 'BOOK' | 'MANAGE') {
    setNotice('')
    const res = await fetch(`/api/salon/${slug}/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, purpose }),
    })
    const data = await res.json()
    if (!res.ok) {
      setNotice(data.error || 'ارسال کد ناموفق بود')
      return
    }
    setDevCode(data.devCode)
    setNotice(data.notice || 'اگر پیامک پیکربندی شده باشد، کد ارسال می‌شود.')
  }

  async function verify(purpose: 'BOOK' | 'MANAGE') {
    const res = await fetch(`/api/salon/${slug}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, purpose }),
    })
    const data = await res.json()
    if (!res.ok) {
      setNotice(data.error || 'تایید ناموفق بود')
      return
    }
    setVerified(true)
    setNotice('شماره تایید شد')
    if (purpose === 'MANAGE') await refreshMine()
  }

  async function refreshMine() {
    const res = await fetch(`/api/salon/${slug}/mine`)
    const data = await res.json()
    if (res.ok) setMine(data.bookings || [])
  }

  async function book(start: string, staffId: string) {
    const res = await fetch(`/api/salon/${slug}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offeringId, employeeId: staffId, start, name }),
    })
    const data = await res.json()
    setNotice(res.ok ? `نوبت ثبت شد. کد پیگیری ${data.reference}. پرداخت در سالن انجام می‌شود.` : data.error)
    if (res.ok) setSlots([])
  }

  useEffect(() => {
    if (mode !== 'ai') return
    fetch(`/api/salon/${slug}/agent/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.connection) {
          setAgentStatus({
            state: data.connection.state,
            message: data.connection.message,
            displayName: data.displayName,
          })
        }
      })
      .catch(() => setAgentStatus({ state: 'error', message: 'وضعیت ایجنت در دسترس نیست' }))
  }, [mode, slug])

  const statusLabel =
    agentStatus?.state === 'connected'
      ? 'متصل'
      : agentStatus?.state === 'configuration_required'
        ? 'نیاز به پیکربندی'
        : agentStatus?.state === 'error'
          ? 'خطا'
          : 'قطع'

  async function askAi() {
    const res = await fetch(`/api/salon/${slug}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: aiInput, conversationId: aiConversationId || undefined }),
    })
    const data = await res.json()
    if (data.conversationId) setAiConversationId(data.conversationId)
    if (data.connection) {
      setAgentStatus({ state: data.connection.state, message: data.connection.message })
    }
    setAiLog((prev) => [...prev, `شما: ${aiInput}`, data.text || data.error])
    setAiInput('')
  }

  const bookStep = !offeringId ? 1 : !date ? 2 : slots.length === 0 ? 2 : verified ? 3 : 3

  return (
    <div className={`booking-desk booking-desk--${theme} space-y-4`}>
      <div className="sb-mode-grid">
        {modes.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`sb-mode-btn${mode === id ? ' is-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'book' && (
        <div className="sb-card sb-panel space-y-3">
          <div className="sb-steps" aria-hidden>
            <span className={`sb-step${bookStep >= 1 ? ' is-on' : ''}`}>۱ — خدمت</span>
            <span className={`sb-step${bookStep >= 2 ? ' is-on' : ''}`}>۲ — زمان</span>
            <span className={`sb-step${bookStep >= 3 ? ' is-on' : ''}`}>۳ — تایید</span>
          </div>
          <select value={offeringId} onChange={(e) => setOfferingId(e.target.value)} className="sb-input">
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — {toman(o.priceToman)} — {o.durationMinutes} دقیقه
              </option>
            ))}
          </select>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="sb-input">
            <option value="">هر پرسنل آزاد</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <input ref={dateRef} type="date" value={date} onChange={(e) => setDate(e.target.value)} onInput={(e) => setDate(e.currentTarget.value)} className="sb-input" />
          <button type="button" onClick={() => loadSlots()} className="sb-cta">نمایش زمان‌های آزاد</button>
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <button key={`${s.employeeId}-${s.start}`} type="button" className="sb-slot" onClick={() => book(s.start, s.employeeId)}>
                {s.label} — {s.employeeName}
              </button>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام مشتری" className="sb-input" />
          <PhoneBox phone={phone} setPhone={setPhone} code={code} setCode={setCode} onOtp={() => sendOtp('BOOK')} onVerify={() => verify('BOOK')} verified={verified} />
        </div>
      )}

      {(mode === 'change' || mode === 'cancel' || mode === 'track') && (
        <div className="sb-card sb-panel space-y-3">
          <PhoneBox phone={phone} setPhone={setPhone} code={code} setCode={setCode} onOtp={() => sendOtp('MANAGE')} onVerify={() => verify('MANAGE')} verified={verified} />
          {mode === 'cancel' && (
            <p className="text-sm text-[var(--sb-muted)]">لغو تا {cancellationHours} ساعت قبل از شروع نوبت ممکن است.</p>
          )}
          <ul className="space-y-2 text-sm">
            {mine.map((row) => (
              <li key={row.id} className="border border-[rgba(212,175,55,0.15)] bg-[#0f0d0b] p-3">
                <p>{row.reference} — {row.service} — {row.employee}</p>
                <p>{new Date(row.start).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })} — {row.status}</p>
                {mode === 'cancel' && ['PENDING', 'CONFIRMED'].includes(row.status) && (
                  <button
                    type="button"
                    className="sb-slot mt-2 !border-red-800/60 !text-red-300"
                    onClick={async () => {
                      const res = await fetch(`/api/salon/${slug}/cancel`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookingId: row.id }),
                      })
                      const data = await res.json()
                      setNotice(res.ok ? 'نوبت لغو شد' : data.error)
                      await refreshMine()
                    }}
                  >
                    تایید لغو
                  </button>
                )}
                {mode === 'change' && ['PENDING', 'CONFIRMED'].includes(row.status) && (
                  <div className="mt-2 space-y-2">
                    <button type="button" onClick={() => setSelected(row.id)} className="text-sm underline">انتخاب برای تغییر</button>
                    {selected === row.id && (
                      <>
                        <input id={`change-date-${row.id}`} type="date" value={date} onChange={(e) => { dateRef.current = e.currentTarget; setDate(e.currentTarget.value) }} className="sb-input" />
                        <button type="button" className="sb-cta" onClick={() => {
                          const input = document.getElementById(`change-date-${row.id}`)
                          if (input instanceof HTMLInputElement) dateRef.current = input
                          setOfferingId(row.offeringId)
                          setEmployeeId(row.employeeId)
                          loadSlots(row.offeringId, row.employeeId)
                        }}>زمان‌های آزاد</button>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((s) => (
                            <button
                              key={s.start}
                              type="button"
                              className="sb-slot"
                              onClick={async () => {
                                const res = await fetch(`/api/salon/${slug}/reschedule`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ bookingId: row.id, start: s.start }),
                                })
                                const data = await res.json()
                                setNotice(res.ok ? 'زمان نوبت عوض شد' : data.error)
                                await refreshMine()
                              }}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === 'ai' && (
        <div className="sb-card sb-panel space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-[var(--sb-gold)]">{agentStatus?.displayName || 'دستیار سالن'}</span>
            <span
              className={
                agentStatus?.state === 'connected'
                  ? 'text-emerald-400'
                  : agentStatus?.state === 'error'
                    ? 'text-red-400'
                    : 'text-amber-400'
              }
            >
              {statusLabel}
              {agentStatus?.message ? ` — ${agentStatus.message}` : ''}
            </span>
          </div>
          <div className="space-y-2 text-sm whitespace-pre-wrap">{aiLog.map((line, i) => <p key={i}>{line}</p>)}</div>
          <div className="flex gap-2">
            <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} className="sb-input flex-1" placeholder="مثلاً قیمت خدمات چیست؟" />
            <button type="button" onClick={askAi} className="sb-cta shrink-0 px-6">ارسال</button>
          </div>
          <p className="text-xs text-[var(--sb-muted)]">پاسخ‌ها از داده همین سالن است. نوبت فقط با دکمه رزرو قطعی می‌شود. تماس صوتی در این نسخه نیست.</p>
        </div>
      )}
      {devCode && <p className="sb-dev-code rounded px-3 py-2 text-sm">کد توسعه: {devCode}</p>}
      {notice && <p className="sb-notice text-sm">{notice}</p>}
    </div>
  )
}

function PhoneBox(props: {
  phone: string
  setPhone: (v: string) => void
  code: string
  setCode: (v: string) => void
  onOtp: () => void
  onVerify: () => void
  verified: boolean
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <input value={props.phone} onChange={(e) => props.setPhone(e.target.value)} onInput={(e) => props.setPhone(e.currentTarget.value)} placeholder="09xxxxxxxxx" className="sb-input" dir="ltr" />
      <input value={props.code} onChange={(e) => props.setCode(e.target.value)} onInput={(e) => props.setCode(e.currentTarget.value)} placeholder="کد تایید" className="sb-input" dir="ltr" />
      <button type="button" onClick={props.onOtp} className="sb-slot">دریافت کد</button>
      <button type="button" onClick={props.onVerify} className="sb-slot">{props.verified ? 'تایید شد ✓' : 'تایید کد'}</button>
    </div>
  )
}
