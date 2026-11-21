'use client'

import { useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import Link from 'next/link'

export default function ChatPage() {
  const [chatConfigured, setChatConfigured] = useState<boolean | null>(null)
  const { messages, input, handleInputChange, handleSubmit, error } = useChat({
    api: '/api/chat',
    body: {
      businessSlug: 'default-salon',
    },
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/chat')
      .then((res) => (res.ok ? res.json() : { configured: false }))
      .then((data: { configured?: boolean }) => {
        if (!cancelled) setChatConfigured(Boolean(data.configured))
      })
      .catch(() => {
        if (!cancelled) setChatConfigured(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isDisabled = chatConfigured === false

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-4 pb-16 pt-28">
      <header className="mb-6 border-b border-mr-border pb-4">
        <h1 className="text-xl font-bold">منشی هوشمند (دمو)</h1>
        <p className="mt-1 text-sm text-mr-muted">
          نمونه فنی رزرو و گفت‌وگو — جدا از صفحه اصلی برند.
        </p>
      </header>

      {isDisabled && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-mr-border bg-mr-surface/80 p-4 text-sm text-white/90"
        >
          <p className="font-semibold text-white">
            گفت‌وگوی آزمایشی OpenAI در حال حاضر غیرفعال است
          </p>
          <p className="mt-1.5 leading-relaxed text-mr-muted">
            این قابلیت اختیاری بوده و بدون تنظیم کلید{' '}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-white/90" dir="ltr">
              OPENAI_API_KEY
            </code>{' '}
            غیرفعال می‌ماند. سایر بخش‌های سایت، فروشگاه و ثبت درخواست بدون مشکل فعال هستند.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-lg bg-mr-red px-4 py-2 text-xs font-semibold text-white"
            >
              ثبت درخواست پشتیبانی
            </Link>
            <Link
              href="/shop"
              className="rounded-lg border border-mr-border px-4 py-2 text-xs font-semibold text-white/90"
            >
              مشاهده فروشگاه
            </Link>
          </div>
        </div>
      )}

      {error && !isDisabled && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-mr-red/40 bg-mr-red/10 p-3 text-sm text-red-200"
        >
          امکان برقراری ارتباط با سرویس گفت‌وگو وجود ندارد. لطفاً بعداً دوباره تلاش کنید.
        </div>
      )}

      <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-3 text-sm ${
                m.role === 'user'
                  ? 'bg-mr-red text-white'
                  : 'border border-mr-border bg-mr-surface text-white/90'
              }`}
            >
              <span className="mb-1 block text-xs opacity-70">
                {m.role === 'user' ? 'شما' : 'دستیار'}
              </span>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          if (isDisabled) {
            e.preventDefault()
            return
          }
          handleSubmit(e)
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          disabled={isDisabled}
          placeholder={isDisabled ? 'سرویس گفت‌وگوی OpenAI غیرفعال است' : 'پیام...'}
          className="flex-1 rounded-xl border border-mr-border bg-mr-black px-4 py-3 text-sm focus:border-mr-red/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isDisabled}
          className="rounded-xl bg-mr-red px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          ارسال
        </button>
      </form>
    </div>
  )
}
