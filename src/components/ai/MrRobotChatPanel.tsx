'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { AssistantAnimState } from '@/components/cinema/engine/character/assistant-state'

const MASCOT_AVATAR_SRC = '/assets/aistudio/IMG_0486_28b8e7ca.PNG'

const INITIAL_GREETING_TEXT = 'سلام! من MR.ROBOT هستم.\nچه کاری میتونم برات انجام بدم؟'

export const SUGGESTED_QUESTIONS = [
  'چه خدماتی ارائه میدید؟',
  'برای خرید از کجا شروع کنم؟',
  'میتونی راهنماییم کنی؟',
  'وضعیت سفارش من چیه؟',
] as const

type UiMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type BackendStatus = {
  checked: boolean
  configured: boolean
  model: string | null
  authenticated: boolean
}

type Props = {
  open: boolean
  assistantState: AssistantAnimState
  onOpen: () => void
  onClose: () => void
  onAssistantStateChange: (state: AssistantAnimState) => void
}

function createGreetingMessage(): UiMessage {
  return {
    id: 'mrrobot-greeting',
    role: 'assistant',
    content: INITIAL_GREETING_TEXT,
  }
}

export function MrRobotChatPanel({
  open,
  assistantState,
  onOpen,
  onClose,
  onAssistantStateChange,
}: Props) {
  const [status, setStatus] = useState<BackendStatus>({
    checked: false,
    configured: false,
    model: null,
    authenticated: false,
  })
  const [messages, setMessages] = useState<UiMessage[]>(() => [createGreetingMessage()])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null)

  const listEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearStateTimer = useCallback(() => {
    if (stateTimerRef.current) {
      clearTimeout(stateTimerRef.current)
      stateTimerRef.current = null
    }
  }, [])

  // Fetch real server-side OpenAI configuration status on mount (and refresh when opened)
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/chat', { cache: 'no-store' })
      if (!res.ok) {
        setStatus({ checked: true, configured: false, model: null, authenticated: false })
        return
      }
      const data = (await res.json()) as {
        configured?: boolean
        model?: string | null
        authenticated?: boolean
      }
      setStatus({
        checked: true,
        configured: Boolean(data.configured),
        model: data.model ?? null,
        authenticated: Boolean(data.authenticated),
      })
    } catch {
      setStatus({ checked: true, configured: false, model: null, authenticated: false })
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  // Manage mascot reaction when chat opens/closes + Escape key + mobile background scroll lock
  useEffect(() => {
    clearStateTimer()
    if (!open) {
      onAssistantStateChange('idle')
      return
    }

    void refreshStatus()
    onAssistantStateChange('attention')
    stateTimerRef.current = setTimeout(() => {
      onAssistantStateChange('listening')
    }, 1250)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    // Lock background scroll only on mobile sheet layout (< 768px)
    const isMobile = window.innerWidth < 768
    const prevOverflow = document.body.style.overflow
    if (isMobile) {
      document.body.style.overflow = 'hidden'
    }

    const focusTimer = setTimeout(() => {
      if (window.innerWidth >= 768) {
        inputRef.current?.focus()
      }
    }, 180)

    return () => {
      clearStateTimer()
      clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKeyDown)
      if (isMobile) {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [open, onClose, onAssistantStateChange, refreshStatus, clearStateTimer])

  useEffect(() => {
    if (!open) return
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending, errorMessage, open])

  const sendMessage = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim()
      if (!trimmed || sending) return

      setErrorMessage(null)
      setLastFailedInput(null)

      if (status.checked && !status.configured) {
        setErrorMessage(
          'دستیار هوشمند MR.ROBOT AI در حال حاضر غیرفعال است. کلید OPENAI_API_KEY در تنظیمات سرور ثبت نشده است.',
        )
        return
      }

      const userMsg: UiMessage = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'user',
        content: trimmed,
      }

      const nextMessages = [...messages, userMsg]
      setMessages(nextMessages)
      setInput('')
      setSending(true)
      clearStateTimer()
      onAssistantStateChange('thinking')

      // Send real conversation history (excluding the static UI greeting if it's the only prior assistant msg)
      const apiMessages = nextMessages
        .filter((m) => m.id !== 'mrrobot-greeting')
        .slice(-14)
        .map((m) => ({ role: m.role, content: m.content }))

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
        })

        const payload = (await res.json().catch(() => ({}))) as {
          reply?: string
          error?: string
          code?: string
          enabled?: boolean
        }

        if (res.status === 503 && payload.code === 'AI_NOT_CONFIGURED') {
          setStatus((prev) => ({ ...prev, checked: true, configured: false }))
          setErrorMessage(
            payload.error ||
              'دستیار هوشمند MR.ROBOT AI در حال حاضر غیرفعال است (OPENAI_API_KEY در سرور تنظیم نشده).',
          )
          setLastFailedInput(trimmed)
          onAssistantStateChange('listening')
          return
        }

        if (!res.ok || !payload.reply) {
          setErrorMessage(
            payload.error || 'خطا در ارتباط با دستیار هوشمند. لطفاً دوباره تلاش کنید.',
          )
          setLastFailedInput(trimmed)
          onAssistantStateChange('listening')
          return
        }

        const assistantReply: UiMessage = {
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'assistant',
          content: payload.reply,
        }
        setMessages((prev) => [...prev, assistantReply])
        onAssistantStateChange('speaking')
        clearStateTimer()
        stateTimerRef.current = setTimeout(() => {
          onAssistantStateChange('listening')
        }, 2800)
      } catch {
        setErrorMessage('اتصال به سرور برقرار نشد. لطفاً اینترنت خود را بررسی کرده و دوباره تلاش کنید.')
        setLastFailedInput(trimmed)
        onAssistantStateChange('listening')
      } finally {
        setSending(false)
      }
    },
    [messages, sending, status.checked, status.configured, onAssistantStateChange, clearStateTimer],
  )

  const handleClearConversation = () => {
    clearStateTimer()
    setMessages([createGreetingMessage()])
    setErrorMessage(null)
    setLastFailedInput(null)
    setInput('')
    onAssistantStateChange('listening')
  }

  const handleRetry = () => {
    if (!lastFailedInput || sending) return
    // Remove trailing failed user duplicate before re-sending cleanly
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.role === 'user' && last.content === lastFailedInput) {
        return prev.slice(0, -1)
      }
      return prev
    })
    void sendMessage(lastFailedInput)
  }

  const isUnavailable = status.checked && !status.configured
  const hasUserMessages = messages.some((m) => m.role === 'user')

  return (
    <>
      {/* Accessible floating mascot launcher when chat panel is closed */}
      {!open ? (
        <button
          type="button"
          data-ai-chat-trigger="true"
          onClick={onOpen}
          aria-label="باز کردن گفت‌وگو با دستیار هوشمند MR.ROBOT AI"
          className="fixed bottom-[max(18px,env(safe-area-inset-bottom))] left-4 z-40 flex min-h-[52px] items-center gap-3 rounded-2xl border border-[#ef1d42]/55 bg-[#070b16]/95 px-3.5 py-2 text-right text-white shadow-[0_14px_40px_rgba(239,29,66,0.28)] transition hover:-translate-y-0.5 hover:border-[#ff3b5c] sm:left-6"
        >
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#ef1d42]/70 bg-black">
            <Image
              src={MASCOT_AVATAR_SRC}
              alt="MR.ROBOT AI"
              fill
              sizes="36px"
              className="object-cover object-[42%_22%] scale-125"
              referrerPolicy="no-referrer"
            />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-white">
              <span dir="ltr" className="font-mono">
                MR.ROBOT AI
              </span>
              <Sparkles className="h-3.5 w-3.5 text-[#ef1d42]" />
            </span>
            <span className="mt-0.5 text-[11px] text-[#a8bad8]">
              برای گفت‌وگو کلیک کنید
            </span>
          </span>
          <MessageSquare className="mr-1 h-4 w-4 text-[#ef1d42]" />
        </button>
      ) : null}

      {/* Mobile backdrop for full-height sheet */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/55 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      {/* Floating MR.ROBOT AI Chat Panel (Desktop: side panel beside 3D mascot | Mobile: responsive sheet) */}
      {open ? (
        <section
          role="dialog"
          aria-label="دستیار هوشمند MR.ROBOT AI"
          data-ai-chat-panel="true"
          data-testid="mr-robot-chat-panel"
          dir="rtl"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[84dvh] flex-col overflow-hidden rounded-t-3xl border border-[#ef1d42]/45 bg-[#060913]/98 text-white shadow-[0_24px_80px_rgba(0,0,0,0.84),0_0_32px_rgba(239,29,66,0.2)] backdrop-blur-xl md:inset-x-auto md:bottom-6 md:right-6 md:h-[min(620px,calc(100dvh-116px))] md:w-[min(420px,calc(100vw-48px))] md:rounded-2xl"
        >
          {/* Top crimson signature accent bar */}
          <div
            className="h-[2px] w-full shrink-0 bg-gradient-to-l from-transparent via-[#ef1d42] to-transparent"
            aria-hidden="true"
          />

          {/* Panel Header */}
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#ef1d42]/20 bg-[#0a0f1f]/98 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#ef1d42]/75 bg-black shadow-[0_0_18px_rgba(239,29,66,0.3)]">
                <Image
                  src={MASCOT_AVATAR_SRC}
                  alt="آواتار رسمی MR.ROBOT"
                  fill
                  sizes="44px"
                  className="object-cover object-[42%_22%] scale-125"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 dir="ltr" className="truncate font-mono text-sm font-extrabold tracking-wider text-white">
                    MR.<span className="text-[#ef1d42]">ROBOT</span> AI
                  </h2>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      !status.checked
                        ? 'bg-slate-400'
                        : status.configured
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-[#a8bad8]">
                    {!status.checked
                      ? 'در حال بررسی وضعیت...'
                      : status.configured
                        ? assistantState === 'thinking'
                          ? 'در حال پردازش...'
                          : assistantState === 'speaking'
                            ? 'در حال پاسخ‌گویی'
                            : 'آنلاین'
                        : 'آفلاین — نیازمند تنظیم سرور'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearConversation}
                disabled={sending}
                aria-label="پاک کردن گفت‌وگو"
                title="پاک کردن گفت‌وگو"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#a8bad8] transition hover:border-[#ef1d42]/45 hover:text-white disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن دستیار هوشمند"
                title="بستن"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#a8bad8] transition hover:border-[#ef1d42]/55 hover:bg-[#ef1d42]/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Scrollable Messages & Suggested Questions */}
          <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
            {/* Honest AI Unavailable Notice when OPENAI_API_KEY is unset on server */}
            {isUnavailable ? (
              <div
                role="status"
                data-testid="ai-unavailable-banner"
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-100"
              >
                <p className="font-bold text-amber-200">
                  سرویس هوش مصنوعی در حال حاضر فعال نیست
                </p>
                <p className="mt-1 text-amber-100/90">
                  برای فعال‌سازی پاسخ‌گویی واقعی، کلید{' '}
                  <code
                    dir="ltr"
                    className="rounded bg-black/45 px-1.5 py-0.5 font-mono text-[11px] text-white"
                  >
                    OPENAI_API_KEY
                  </code>{' '}
                  باید در تنظیمات سرور ثبت شود. سایر بخش‌های فروشگاه، سبد خرید و ثبت سفارش بدون محدودیت فعال هستند.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Link
                    href="/shop"
                    onClick={onClose}
                    className="rounded-lg bg-[#ef1d42] px-3 py-1.5 text-[11px] font-semibold text-white hover:brightness-110"
                  >
                    مشاهده فروشگاه
                  </Link>
                  <Link
                    href="/contact"
                    onClick={onClose}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10"
                  >
                    ارتباط با پشتیبانی
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Message Bubbles */}
            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser ? (
                    <span className="relative mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-[#ef1d42]/60 bg-black">
                      <Image
                        src={MASCOT_AVATAR_SRC}
                        alt="MR.ROBOT"
                        fill
                        sizes="28px"
                        className="object-cover object-[42%_22%] scale-125"
                        referrerPolicy="no-referrer"
                      />
                    </span>
                  ) : null}

                  <div
                    dir="auto"
                    className={`max-w-[84%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-7 ${
                      isUser
                        ? 'rounded-tl-md bg-gradient-to-br from-[#c81234] to-[#ef1d42] text-white shadow-[0_6px_18px_rgba(239,29,66,0.28)]'
                        : 'rounded-tr-md border border-[#ef1d42]/30 bg-[#0d1324] text-[#f4f7fd]'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })}

            {/* Suggested Quick Questions (prominent before first user message, compact option otherwise) */}
            {!hasUserMessages ? (
              <div className="space-y-2 pt-1" aria-label="سوالات پیشنهادی">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendMessage(q)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#ef1d42]/35 bg-[#0c1120] px-3.5 py-2.5 text-right text-xs font-medium text-[#e6eefc] transition hover:border-[#ef1d42]/80 hover:bg-[#141b30] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span>{q}</span>
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#ef1d42]/80" />
                  </button>
                ))}
              </div>
            ) : null}

            {/* Loading Indicator */}
            {sending ? (
              <div className="flex items-center gap-2.5 text-xs text-[#a8bad8]" role="status">
                <Loader2 className="h-4 w-4 animate-spin text-[#ef1d42]" />
                <span>MR.ROBOT در حال بررسی و نوشتن پاسخ...</span>
              </div>
            ) : null}

            {/* Error + Retry State */}
            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-[#ef1d42]/45 bg-[#ef1d42]/12 p-3 text-xs text-red-100"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff4d6d]" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
                {lastFailedInput && !isUnavailable ? (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[#ef1d42]/50 bg-[#ef1d42]/20 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#ef1d42]/35"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>تلاش مجدد</span>
                  </button>
                ) : null}
              </div>
            ) : null}

            <div ref={listEndRef} />
          </div>

          {/* RTL Input Footer with mobile safe-area inset */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void sendMessage(input)
            }}
            className="shrink-0 border-t border-[#ef1d42]/20 bg-[#080d1a] px-3.5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                dir="auto"
                value={input}
                maxLength={1200}
                disabled={sending || isUnavailable}
                onChange={(e) => {
                  setInput(e.target.value)
                  if (!sending && open) {
                    onAssistantStateChange('listening')
                  }
                }}
                placeholder={
                  isUnavailable
                    ? 'سرویس هوش مصنوعی غیرفعال است'
                    : 'پیام خود را بنویسید...'
                }
                aria-label="متن پیام به دستیار هوشمند MR.ROBOT"
                className="min-h-[44px] flex-1 rounded-xl border border-white/12 bg-[#040711] px-3.5 py-2.5 text-sm text-white placeholder:text-[#7c92b8] focus:border-[#ef1d42]/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-55"
              />
              <button
                type="submit"
                disabled={sending || isUnavailable || input.trim().length === 0}
                aria-label="ارسال پیام"
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#c81234] to-[#ef1d42] text-white shadow-[0_6px_20px_rgba(239,29,66,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  )
}
