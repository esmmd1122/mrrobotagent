'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Send, X } from 'lucide-react'
import { useCart } from '@/components/cart/CartProvider'

type Props = {
  open: boolean
  subjectTitle: string
  onClose: () => void
}

export function ServiceRequestModal({ open, subjectTitle, onClose }: Props) {
  const { showToast } = useCart()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (message.trim().length < 5) {
      setError('لطفاً توضیح سرویس یا مدل دستگاه را حداقل در ۵ کاراکتر وارد کنید.')
      return
    }
    setSubmitting(true)
    try {
      const subject = subjectTitle.startsWith('درخواست:')
        ? subjectTitle
        : `درخواست: ${subjectTitle}`
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          subject,
          message: message.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'ارسال درخواست با خطا مواجه شد. دوباره تلاش کنید.')
        return
      }
      setName('')
      setContact('')
      setMessage('')
      onClose()
      showToast('درخواست شما با موفقیت ثبت شد — کارشناس MR.ROBOT پیگیری می‌کند')
    } catch {
      setError('خطای ارتباط با سرور. لطفاً لحظاتی دیگر دوباره تلاش کنید.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={`cinema-modal-overlay ${open ? 'is-open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-labelledby="cinema-request-modal-title"
    >
      <div className="cinema-modal-box">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-[#38bdf8]">
              پشتیبانی تخصصی MR.ROBOT
            </span>
            <h3
              id="cinema-request-modal-title"
              className="mt-1 text-lg font-extrabold text-white"
            >
              {subjectTitle || 'ثبت درخواست مشاوره'}
            </h3>
          </div>
          <button
            type="button"
            className="cinema-icon-close"
            onClick={onClose}
            aria-label="بستن پنجره درخواست"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-[#a8bad8]">
          مشخصات سرویس یا دستگاه مورد نیاز خود را وارد کنید تا تیکت رسمی در سیستم MR.ROBOT ثبت
          شود و کارشناس ما شرایط و برآورد دقیق را به شما اعلام کند.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="cinema-field-input"
            placeholder="نام و نام خانوادگی"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="text"
            className="cinema-field-input"
            placeholder="شماره تماس، ایمیل یا آیدی تلگرام"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
          />
          <textarea
            rows={3}
            className="cinema-field-input resize-none"
            placeholder="توضیح سرویس، پلن مورد نظر یا مدل دستگاه (مثلاً آیفون، پلن تیمی AI و...)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={5}
          />
          {error ? (
            <p className="mb-3 rounded-lg border border-[#ef1d42]/40 bg-[#ef1d42]/10 px-3 py-2 text-xs text-[#fecdd3]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="cinema-btn cinema-btn-buy w-full"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? 'در حال ثبت درخواست...' : 'ارسال درخواست به پشتیبانی'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
