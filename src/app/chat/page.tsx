'use client'

import { useChat } from '@ai-sdk/react'

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    body: {
      businessSlug: 'default-salon',
    },
  })

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-4 pb-16 pt-24">
      <header className="mb-6 border-b border-mr-border pb-4">
        <h1 className="text-xl font-bold">منشی هوشمند (دمو)</h1>
        <p className="mt-1 text-sm text-mr-muted">
          نمونه فنی رزرو و گفت‌وگو — جدا از صفحه اصلی برند.
        </p>
      </header>

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

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="پیام..."
          className="flex-1 rounded-xl border border-mr-border bg-mr-black px-4 py-3 text-sm focus:border-mr-red/50 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-mr-red px-5 py-3 text-sm font-semibold text-white"
        >
          ارسال
        </button>
      </form>
    </div>
  )
}
