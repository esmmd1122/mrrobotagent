'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { useCart } from '@/components/cart/CartProvider'
import {
  AI_PROJECT_CATEGORIES,
  AI_PROJECT_FEATURE_OPTIONS,
  AI_PROJECT_INTEGRATION_OPTIONS,
  AI_PROJECT_PRICING_LABEL,
  AI_PROJECT_USAGE_LABELS,
  getAIProjectCategory,
  type AIProjectCategoryId,
  type AIProjectUsageScope,
} from '@/lib/ai-projects'

type Props = {
  open: boolean
  initialCategoryId?: AIProjectCategoryId
  onClose: () => void
}

type Step = 1 | 2 | 3

type SubmissionResult = {
  requestId: string
  referenceCode: string
  ticketId: string | null
}

export function AIProjectRequestModal({
  open,
  initialCategoryId = 'business-ai-assistant',
  onClose,
}: Props) {
  const { showToast } = useCart()

  const [step, setStep] = useState<Step>(1)
  const [projectType, setProjectType] = useState<AIProjectCategoryId>(initialCategoryId)
  const [usageScope, setUsageScope] = useState<AIProjectUsageScope>('BUSINESS')
  const [features, setFeatures] = useState<string[]>([])
  const [integrations, setIntegrations] = useState<string[]>([])
  const [expectedFunctionality, setExpectedFunctionality] = useState('')
  const [additionalDescription, setAdditionalDescription] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactTelegram, setContactTelegram] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<SubmissionResult | null>(null)

  const selectedCategory = useMemo(
    () => getAIProjectCategory(projectType) ?? AI_PROJECT_CATEGORIES[0],
    [projectType],
  )

  // Synchronize category defaults whenever modal opens with a specific project category
  useEffect(() => {
    if (!open) return
    const cat = getAIProjectCategory(initialCategoryId) ?? AI_PROJECT_CATEGORIES[0]
    setStep(1)
    setProjectType(cat.id)
    setUsageScope(cat.id === 'personal-ai-assistant' ? 'PERSONAL' : 'BUSINESS')
    setFeatures([...cat.defaultFeatures])
    setIntegrations([...cat.defaultIntegrations])
    setError(null)
    setSubmitted(null)
  }, [open, initialCategoryId])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const handleCategorySwitch = (nextId: AIProjectCategoryId) => {
    const cat = getAIProjectCategory(nextId)
    setProjectType(nextId)
    if (cat) {
      setUsageScope(cat.id === 'personal-ai-assistant' ? 'PERSONAL' : 'BUSINESS')
      setFeatures([...cat.defaultFeatures])
      setIntegrations([...cat.defaultIntegrations])
    }
  }

  const toggleFeature = (label: string) => {
    setFeatures((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label],
    )
  }

  const toggleIntegration = (label: string) => {
    setIntegrations((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label],
    )
  }

  const goToStep2 = () => {
    setError(null)
    setStep(2)
  }

  const goToStep3 = () => {
    setError(null)
    if (expectedFunctionality.trim().length < 8) {
      setError('لطفاً عملکرد مورد انتظار سیستم را حداقل در ۸ کاراکتر توضیح دهید.')
      return
    }
    if (contactName.trim().length < 2) {
      setError('لطفاً نام و نام خانوادگی خود را وارد کنید.')
      return
    }
    const hasPhone = contactPhone.trim().length >= 7
    const hasEmail = contactEmail.trim().length > 0
    const hasTelegram = contactTelegram.trim().length >= 2
    if (!hasPhone && !hasEmail && !hasTelegram) {
      setError('حداقل یک راه ارتباطی معتبر (شماره تماس، ایمیل یا آیدی تلگرام) وارد کنید.')
      return
    }
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setError('فرمت ایمیل واردشده معتبر نیست.')
      return
    }
    setStep(3)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (step !== 3 || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/ai-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType,
          usageScope,
          features,
          integrations,
          expectedFunctionality: expectedFunctionality.trim(),
          additionalDescription: additionalDescription.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim(),
          contactTelegram: contactTelegram.trim(),
        }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        requestId?: string
        referenceCode?: string
        ticketId?: string | null
        error?: string
      }

      if (!res.ok || !data.ok || !data.requestId || !data.referenceCode) {
        setError(data.error || 'ارسال درخواست پروژه با خطا مواجه شد. لطفاً دوباره تلاش کنید.')
        return
      }

      setSubmitted({
        requestId: data.requestId,
        referenceCode: data.referenceCode,
        ticketId: data.ticketId ?? null,
      })
      setExpectedFunctionality('')
      setAdditionalDescription('')
      showToast(`درخواست پروژه با کد پیگیری ${data.referenceCode} ثبت شد`)
    } catch {
      setError('خطای ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[260] flex items-end justify-center bg-[#02050d]/85 p-0 backdrop-blur-sm md:items-center md:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-project-modal-title"
      data-testid="ai-project-request-modal"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#38bdf8]/25 bg-[#070d1c] text-white shadow-[0_28px_90px_rgba(0,0,0,0.85)] md:max-w-2xl md:rounded-2xl">
        {/* Top gradient signature rule */}
        <div
          className="h-[2px] w-full shrink-0 bg-gradient-to-l from-[#ef1d42] via-[#8b5cf6] to-[#38bdf8]"
          aria-hidden="true"
        />

        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#091226] px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#38bdf8]">
              MR.ROBOT AI — پیکربندی پروژه اختصاصی
            </p>
            <h3
              id="ai-project-modal-title"
              className="mt-0.5 truncate text-base font-extrabold text-white sm:text-lg"
            >
              {submitted ? 'درخواست پروژه با موفقیت ثبت شد' : selectedCategory.titleFa}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن فرم ساخت پروژه هوش مصنوعی"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-[#a8bad8] transition hover:border-[#ef1d42]/50 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        {!submitted ? (
          <div className="grid shrink-0 grid-cols-3 border-b border-white/8 bg-[#060b18] px-5 py-2.5 text-xs">
            {(
              [
                { id: 1, label: '۱. نوع و امکانات' },
                { id: 2, label: '۲. جزئیات و تماس' },
                { id: 3, label: '۳. بازبینی و ثبت' },
              ] as const
            ).map((s) => {
              const active = step === s.id
              const done = step > s.id
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-center gap-1.5 font-semibold ${
                    active
                      ? 'text-[#38bdf8]'
                      : done
                        ? 'text-emerald-400'
                        : 'text-[#7c92b8]'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : null}
                  <span>{s.label}</span>
                </div>
              )
            })}
          </div>
        ) : null}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {submitted ? (
            <div
              data-testid="ai-project-confirmation"
              className="space-y-5 py-3 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/35 bg-emerald-500/12 text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-extrabold text-white">
                  درخواست شما در صف بررسی تیم فنی MR.ROBOT ثبت شد
                </h4>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-[#a8bad8]">
                  هیچ مبلغی اکنون دریافت نشده است. پس از بررسی دقیق نیازها، برآورد هزینه، زمان
                  تحویل و پیش‌فاکتور اختصاصی برای شما ارسال می‌شود و تنها در صورت تأیید شما وارد
                  مرحله سفارش خواهد شد.
                </p>
              </div>

              <div className="mx-auto max-w-sm rounded-xl border border-[#38bdf8]/30 bg-[#0b152b] px-4 py-3.5">
                <p className="text-xs text-[#93a9cf]">کد پیگیری درخواست پروژه</p>
                <p
                  dir="ltr"
                  data-testid="ai-project-reference-code"
                  className="mt-1 font-mono text-lg font-bold tracking-wider text-[#38bdf8]"
                >
                  {submitted.referenceCode}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-l from-[#c81234] to-[#ef1d42] px-6 text-sm font-bold text-white transition hover:brightness-110"
                >
                  بازگشت به صفحه اصلی
                </button>
                <Link
                  href="/shop"
                  onClick={onClose}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-[#dbeafe] transition hover:border-[#38bdf8]/45 hover:text-white"
                >
                  مشاهده فروشگاه اشتراک‌ها
                </Link>
              </div>
            </div>
          ) : (
            <form id="ai-project-form" onSubmit={handleSubmit} className="space-y-5">
              {step === 1 ? (
                <>
                  {/* Project Type Selector */}
                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#c7d7f4]">
                      نوع پروژه هوش مصنوعی
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {AI_PROJECT_CATEGORIES.map((cat) => {
                        const selected = cat.id === projectType
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategorySwitch(cat.id)}
                            className={`flex min-h-[48px] flex-col items-start rounded-xl border px-3.5 py-2.5 text-right transition ${
                              selected
                                ? 'border-[#38bdf8] bg-[#0e2040] text-white'
                                : 'border-white/10 bg-[#0b1326] text-[#a8bad8] hover:border-white/25 hover:text-white'
                            }`}
                          >
                            <span className="text-xs font-bold">{cat.titleFa}</span>
                            <span
                              dir="ltr"
                              className="mt-0.5 font-mono text-[11px] text-[#7c92b8]"
                            >
                              {cat.titleEn}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Personal vs Business Toggle */}
                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#c7d7f4]">
                      کاربری پروژه
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(
                        [
                          { id: 'BUSINESS', label: 'کسب‌وکار / سازمانی', Icon: Building2 },
                          { id: 'PERSONAL', label: 'استفاده شخصی', Icon: User },
                        ] as const
                      ).map(({ id, label, Icon }) => {
                        const active = usageScope === id
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setUsageScope(id)}
                            className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition sm:text-sm ${
                              active
                                ? 'border-[#8b5cf6] bg-[#19153c] text-white'
                                : 'border-white/10 bg-[#0b1326] text-[#a8bad8] hover:border-white/25'
                            }`}
                          >
                            <Icon className="h-4 w-4 text-[#a78bfa]" />
                            <span>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Desired Features */}
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-[#c7d7f4]">
                        امکانات مورد نظر (قابل انتخاب چندگانه)
                      </label>
                      <span className="text-[11px] text-[#7c92b8]">
                        {features.length} مورد انتخاب‌شده
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {AI_PROJECT_FEATURE_OPTIONS.map((feat) => {
                        const selected = features.includes(feat)
                        return (
                          <button
                            key={feat}
                            type="button"
                            onClick={() => toggleFeature(feat)}
                            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                              selected
                                ? 'border-[#38bdf8]/70 bg-[#38bdf8]/15 text-white'
                                : 'border-white/10 bg-[#0b1326] text-[#9eb2d4] hover:border-white/25 hover:text-white'
                            }`}
                          >
                            {selected ? <Check className="h-3.5 w-3.5 text-[#38bdf8]" /> : null}
                            <span>{feat}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Required Integrations */}
                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#c7d7f4]">
                      اتصالات و بسترهای مورد نیاز
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AI_PROJECT_INTEGRATION_OPTIONS.map((integ) => {
                        const selected = integrations.includes(integ)
                        return (
                          <button
                            key={integ}
                            type="button"
                            onClick={() => toggleIntegration(integ)}
                            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                              selected
                                ? 'border-[#8b5cf6]/80 bg-[#8b5cf6]/20 text-white'
                                : 'border-white/10 bg-[#0b1326] text-[#9eb2d4] hover:border-white/25 hover:text-white'
                            }`}
                          >
                            {selected ? <Check className="h-3.5 w-3.5 text-[#c4b5fd]" /> : null}
                            <span>{integ}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  {/* Expected Functionality */}
                  <div>
                    <label
                      htmlFor="ai-proj-functionality"
                      className="mb-1.5 block text-xs font-bold text-[#c7d7f4]"
                    >
                      عملکرد مورد انتظار سیستم <span className="text-[#ef1d42]">*</span>
                    </label>
                    <textarea
                      id="ai-proj-functionality"
                      rows={3}
                      value={expectedFunctionality}
                      onChange={(e) => setExpectedFunctionality(e.target.value)}
                      placeholder="به‌صورت فارسی بنویسید انتظار دارید این سیستم هوشمند دقیقاً چه کاری برای شما یا کسب‌وکارتان انجام دهد..."
                      className="w-full rounded-xl border border-white/15 bg-[#050a16] px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-[#6f85ad] focus:border-[#38bdf8] focus:outline-none"
                      required
                    />
                  </div>

                  {/* Additional Description */}
                  <div>
                    <label
                      htmlFor="ai-proj-notes"
                      className="mb-1.5 block text-xs font-bold text-[#c7d7f4]"
                    >
                      توضیحات تکمیلی (اختیاری)
                    </label>
                    <textarea
                      id="ai-proj-notes"
                      rows={2}
                      value={additionalDescription}
                      onChange={(e) => setAdditionalDescription(e.target.value)}
                      placeholder="حجم پیام‌ها یا تماس‌های روزانه، زمان‌بندی مدنظر، لینک وب‌سایت یا نکات خاص..."
                      className="w-full rounded-xl border border-white/15 bg-[#050a16] px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-[#6f85ad] focus:border-[#38bdf8] focus:outline-none"
                    />
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 rounded-xl border border-white/10 bg-[#0b1326] p-4">
                    <div>
                      <p className="text-xs font-bold text-white">اطلاعات تماس جهت ارسال مشاوره و برآورد</p>
                      <p className="mt-0.5 text-[11px] text-[#8fa6cc]">
                        نام و حداقل یک راه ارتباطی (شماره تماس، ایمیل یا تلگرام) الزامی است.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="ai-proj-name"
                          className="mb-1 block text-[11px] font-semibold text-[#c7d7f4]"
                        >
                          نام و نام خانوادگی <span className="text-[#ef1d42]">*</span>
                        </label>
                        <input
                          id="ai-proj-name"
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="مثلاً علی احمدی"
                          className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#050a16] px-3.5 text-sm text-white placeholder:text-[#6f85ad] focus:border-[#38bdf8] focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="ai-proj-phone"
                          className="mb-1 block text-[11px] font-semibold text-[#c7d7f4]"
                        >
                          شماره تماس
                        </label>
                        <input
                          id="ai-proj-phone"
                          type="tel"
                          dir="ltr"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="0912..."
                          className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#050a16] px-3.5 text-left text-sm text-white placeholder:text-[#6f85ad] focus:border-[#38bdf8] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="ai-proj-email"
                          className="mb-1 block text-[11px] font-semibold text-[#c7d7f4]"
                        >
                          ایمیل (اختیاری)
                        </label>
                        <input
                          id="ai-proj-email"
                          type="email"
                          dir="ltr"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#050a16] px-3.5 text-left text-sm text-white placeholder:text-[#6f85ad] focus:border-[#38bdf8] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="ai-proj-telegram"
                          className="mb-1 block text-[11px] font-semibold text-[#c7d7f4]"
                        >
                          آیدی تلگرام (اختیاری)
                        </label>
                        <input
                          id="ai-proj-telegram"
                          type="text"
                          dir="ltr"
                          value={contactTelegram}
                          onChange={(e) => setContactTelegram(e.target.value)}
                          placeholder="@username"
                          className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#050a16] px-3.5 text-left text-sm text-white placeholder:text-[#6f85ad] focus:border-[#38bdf8] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#38bdf8]/25 bg-[#0a1429] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <p className="text-[11px] text-[#8fa6cc]">نوع پروژه انتخاب‌شده</p>
                        <p className="mt-0.5 text-sm font-extrabold text-white">
                          {selectedCategory.titleFa}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#38bdf8]">
                        {AI_PROJECT_USAGE_LABELS[usageScope]}
                      </span>
                    </div>

                    <dl className="mt-3 space-y-2.5 text-xs">
                      <div>
                        <dt className="text-[#8fa6cc]">امکانات انتخاب‌شده</dt>
                        <dd className="mt-1 leading-relaxed text-white">
                          {features.length > 0 ? features.join(' · ') : 'مشخص‌نشده (بررسی در مشاوره)'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#8fa6cc]">اتصالات مورد نیاز</dt>
                        <dd className="mt-1 leading-relaxed text-white">
                          {integrations.length > 0
                            ? integrations.join(' · ')
                            : 'مشخص‌نشده (بررسی در مشاوره)'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#8fa6cc]">عملکرد مورد انتظار</dt>
                        <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-[#e6eefc]">
                          {expectedFunctionality}
                        </dd>
                      </div>
                      {additionalDescription.trim() ? (
                        <div>
                          <dt className="text-[#8fa6cc]">توضیحات تکمیلی</dt>
                          <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-[#cbd8f0]">
                            {additionalDescription}
                          </dd>
                        </div>
                      ) : null}
                      <div className="border-t border-white/10 pt-2.5">
                        <dt className="text-[#8fa6cc]">اطلاعات تماس</dt>
                        <dd className="mt-1 text-white">
                          {contactName}
                          {contactPhone ? ` · ${contactPhone}` : ''}
                          {contactEmail ? ` · ${contactEmail}` : ''}
                          {contactTelegram ? ` · ${contactTelegram}` : ''}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-xl border border-[#8b5cf6]/30 bg-[#13112d] px-4 py-3 text-xs leading-relaxed text-[#d7d3ff]">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#a78bfa]" />
                    <p>
                      <strong className="font-bold text-white">{AI_PROJECT_PRICING_LABEL}:</strong>{' '}
                      این پروژه به‌صورت اختصاصی طراحی می‌شود. ثبت درخواست به معنای خرید یا پرداخت
                      نیست و قیمت نهایی تنها پس از بررسی فنی و تأیید شما اعلام خواهد شد.
                    </p>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  data-testid="ai-project-form-error"
                  className="rounded-xl border border-[#ef1d42]/50 bg-[#ef1d42]/12 px-3.5 py-2.5 text-xs font-medium text-[#fecdd3]"
                >
                  {error}
                </div>
              ) : null}
            </form>
          )}
        </div>

        {/* Modal Footer Navigation */}
        {!submitted ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#091226] px-5 py-3.5">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setStep((prev) => (prev === 3 ? 2 : 1))
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-semibold text-[#dbeafe] transition hover:border-white/30 hover:text-white sm:text-sm"
              >
                <ArrowRight className="h-4 w-4" />
                <span>مرحله قبل</span>
              </button>
            ) : (
              <span className="text-[11px] font-medium text-[#8fa6cc]">
                {AI_PROJECT_PRICING_LABEL}
              </span>
            )}

            {step === 1 ? (
              <button
                type="button"
                data-testid="ai-project-next-1"
                onClick={goToStep2}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-l from-[#2563eb] to-[#38bdf8] px-5 text-xs font-extrabold text-white transition hover:brightness-110 sm:text-sm"
              >
                <span>ادامه و وارد کردن جزئیات</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}

            {step === 2 ? (
              <button
                type="button"
                data-testid="ai-project-next-2"
                onClick={goToStep3}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-l from-[#7c3aed] to-[#38bdf8] px-5 text-xs font-extrabold text-white transition hover:brightness-110 sm:text-sm"
              >
                <span>بازبینی نهایی درخواست</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}

            {step === 3 ? (
              <button
                type="submit"
                form="ai-project-form"
                disabled={submitting}
                data-testid="ai-project-submit"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-l from-[#c81234] to-[#ef1d42] px-6 text-xs font-extrabold text-white shadow-[0_10px_28px_rgba(239,29,66,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 sm:text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>در حال ثبت درخواست...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>ثبت نهایی درخواست پروژه</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
