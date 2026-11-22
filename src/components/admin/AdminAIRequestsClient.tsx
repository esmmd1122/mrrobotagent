'use client'

import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  Save,
  Search,
  Send,
  X,
} from 'lucide-react'
import {
  AI_PROJECT_STATUSES,
  AI_PROJECT_STATUS_LABELS,
  AI_PROJECT_USAGE_LABELS,
  buildSafeContactLinks,
  getAIProjectStatusLabel,
  type AIProjectStatus,
  type ParsedAIProjectRecord,
} from '@/lib/ai-projects'

type Props = {
  initialRequests: ParsedAIProjectRecord[]
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  NEW: 'border-sky-400/40 bg-sky-500/15 text-sky-200',
  UNDER_REVIEW: 'border-violet-400/40 bg-violet-500/15 text-violet-200',
  WAITING_FOR_CUSTOMER: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  QUOTATION_SENT: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200',
  APPROVED: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  IN_PROGRESS: 'border-blue-400/40 bg-blue-500/15 text-blue-200',
  COMPLETED: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-100',
  REJECTED: 'border-rose-500/45 bg-rose-500/15 text-rose-200',
}

function formatDateFa(iso: string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function AdminAIRequestsClient({ initialRequests }: Props) {
  const [requests, setRequests] = useState<ParsedAIProjectRecord[]>(initialRequests)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(initialRequests[0]?.id ?? null)

  // Editable admin fields for selected request
  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId],
  )

  const [editStatus, setEditStatus] = useState<AIProjectStatus>(
    (selected?.status as AIProjectStatus) || 'NEW',
  )
  const [editPrice, setEditPrice] = useState<string>(
    selected?.proposedPrice ? String(selected.proposedPrice) : '',
  )
  const [editDelivery, setEditDelivery] = useState<string>(selected?.estimatedDelivery ?? '')
  const [editNote, setEditNote] = useState<string>(selected?.internalNote ?? '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const selectRequest = (rec: ParsedAIProjectRecord) => {
    setSelectedId(rec.id)
    setEditStatus(
      (AI_PROJECT_STATUSES.includes(rec.status as AIProjectStatus)
        ? rec.status
        : 'NEW') as AIProjectStatus,
    )
    setEditPrice(rec.proposedPrice ? String(rec.proposedPrice) : '')
    setEditDelivery(rec.estimatedDelivery ?? '')
    setEditNote(rec.internalNote ?? '')
    setSaveMsg(null)
    setSaveError(null)
  }

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase()
    return requests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.referenceCode.toLowerCase().includes(q) ||
        r.contactName.toLowerCase().includes(q) ||
        r.contact.toLowerCase().includes(q) ||
        r.projectTypeTitleFa.toLowerCase().includes(q) ||
        r.expectedFunctionality.toLowerCase().includes(q)
      )
    })
  }, [requests, statusFilter, query])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: requests.length }
    for (const s of AI_PROJECT_STATUSES) counts[s] = 0
    for (const r of requests) {
      counts[r.status] = (counts[r.status] ?? 0) + 1
    }
    return counts
  }, [requests])

  async function handleSaveAdminUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected || saving) return
    setSaving(true)
    setSaveMsg(null)
    setSaveError(null)

    const priceTrimmed = editPrice.replace(/[,٬\s]/g, '').trim()
    let proposedPrice: number | null = null
    if (priceTrimmed.length > 0) {
      const numeric = Number(priceTrimmed)
      if (!Number.isFinite(numeric) || numeric <= 0) {
        setSaveError('قیمت پیشنهادی باید یک عدد مثبت معتبر به تومان باشد.')
        setSaving(false)
        return
      }
      proposedPrice = Math.round(numeric)
    }

    try {
      const res = await fetch(`/api/admin/ai-projects/${encodeURIComponent(selected.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          proposedPrice,
          estimatedDelivery: editDelivery.trim(),
          internalNote: editNote.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        request?: ParsedAIProjectRecord
        error?: string
      }

      if (!res.ok || !data.ok || !data.request) {
        setSaveError(data.error || 'ذخیره تغییرات انجام نشد.')
        return
      }

      setRequests((prev) =>
        prev.map((item) => (item.id === data.request!.id ? data.request! : item)),
      )
      setSaveMsg('تغییرات وضعیت، برآورد و یادداشت با موفقیت ذخیره شد.')
    } catch {
      setSaveError('خطا در برقراری ارتباط با سرور.')
    } finally {
      setSaving(false)
    }
  }

  const contactLinks = selected
    ? buildSafeContactLinks({
        phone: selected.contactPhone,
        email: selected.contactEmail,
        telegram: selected.contactTelegram,
      })
    : { telHref: null, mailtoHref: null, telegramHref: null }

  return (
    <div className="space-y-5" data-testid="admin-ai-requests-manager">
      {/* Status Filters & Search */}
      <div className="admin-card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">
              درخواست‌های پروژه هوش مصنوعی ({requests.length})
            </h2>
            <p className="mt-0.5 text-xs text-white/55">
              بررسی نیازها، تعیین وضعیت، ثبت قیمت پیشنهادی و زمان تحویل و ارتباط مستقیم با مشتری
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جست‌وجو بر اساس کد، نام یا پروژه..."
              className="w-full rounded-xl border border-white/12 bg-black/40 py-2 pr-9 pl-3 text-xs text-white placeholder:text-white/40 focus:border-[#38bdf8] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="فیلتر وضعیت درخواست‌ها">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === 'ALL'
                ? 'border-[#38bdf8]/60 bg-[#38bdf8]/15 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white'
            }`}
          >
            همه ({statusCounts.ALL ?? 0})
          </button>
          {AI_PROJECT_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === st
                  ? 'border-[#38bdf8]/60 bg-[#38bdf8]/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white'
              }`}
            >
              {AI_PROJECT_STATUS_LABELS[st]} ({statusCounts[st] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* Main Master-Detail Layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Request Table */}
        <section className="admin-card overflow-x-auto p-4 xl:col-span-7">
          {filteredRequests.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/55">
              درخواستی با این فیلتر یافت نشد.
            </p>
          ) : (
            <table className="admin-table w-full text-right">
              <thead>
                <tr>
                  <th>کد و پروژه</th>
                  <th>مشتری و تماس</th>
                  <th>برآورد</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((r) => {
                  const isCurrent = selected?.id === r.id
                  const badgeStyle =
                    STATUS_BADGE_STYLES[r.status] ??
                    'border-white/15 bg-white/10 text-white/80'

                  return (
                    <tr
                      key={r.id}
                      data-testid={`admin-ai-row-${r.referenceCode}`}
                      className={isCurrent ? 'bg-white/[0.06]' : undefined}
                    >
                      <td>
                        <div className="font-semibold text-white">{r.projectTypeTitleFa}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/50">
                          <span dir="ltr" className="font-mono text-[#38bdf8]">
                            {r.referenceCode}
                          </span>
                          <span>·</span>
                          <span>{formatDateFa(r.createdAt)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs font-semibold text-white">{r.contactName}</div>
                        <div dir="ltr" className="mt-0.5 text-right text-[11px] text-white/60">
                          {r.contact}
                        </div>
                      </td>
                      <td className="text-xs text-white/75 tabular-nums">
                        {r.proposedPrice
                          ? `${r.proposedPrice.toLocaleString('fa-IR')} تومان`
                          : 'استعلام قیمت'}
                        {r.estimatedDelivery ? (
                          <div className="mt-0.5 text-[11px] text-white/50">
                            {r.estimatedDelivery}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeStyle}`}
                        >
                          {getAIProjectStatusLabel(r.status)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => selectRequest(r)}
                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-[#38bdf8]/60 hover:bg-[#38bdf8]/15"
                        >
                          جزئیات
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Detail & Management Panel */}
        <section
          className="admin-card p-5 xl:col-span-5"
          data-testid="admin-ai-request-detail"
        >
          {selected ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span dir="ltr" className="font-mono text-xs font-bold text-[#38bdf8]">
                      {selected.referenceCode}
                    </span>
                    {selected.usageScope ? (
                      <span className="text-xs text-white/60">
                        · {AI_PROJECT_USAGE_LABELS[selected.usageScope]}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 text-base font-extrabold text-white">
                    {selected.projectTypeTitleFa}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/50">
                    <Clock className="h-3.5 w-3.5" />
                    <span>ثبت‌شده در {formatDateFa(selected.createdAt)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="بستن جزئیات"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white xl:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Customer Specifications */}
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5">
                  <p className="font-bold text-[#38bdf8]">عملکرد مورد انتظار</p>
                  <p className="mt-1.5 whitespace-pre-wrap leading-6 text-white/90">
                    {selected.expectedFunctionality || '—'}
                  </p>
                  {selected.additionalDescription ? (
                    <>
                      <p className="mt-3 font-bold text-[#c4b5fd]">توضیحات تکمیلی</p>
                      <p className="mt-1 whitespace-pre-wrap leading-6 text-white/80">
                        {selected.additionalDescription}
                      </p>
                    </>
                  ) : null}
                </div>

                {selected.features.length > 0 ? (
                  <div>
                    <p className="mb-1.5 font-bold text-white/75">امکانات درخواستی</p>
                    <p className="leading-6 text-white/85">{selected.features.join(' · ')}</p>
                  </div>
                ) : null}

                {selected.integrations.length > 0 ? (
                  <div>
                    <p className="mb-1.5 font-bold text-white/75">اتصالات مورد نیاز</p>
                    <p className="leading-6 text-white/85">{selected.integrations.join(' · ')}</p>
                  </div>
                ) : null}

                {/* Customer Contact Actions */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5">
                  <p className="font-bold text-white">اطلاعات تماس مشتری</p>
                  <p className="mt-1 text-white/85">{selected.contactName}</p>
                  <p dir="ltr" className="mt-0.5 text-right text-[11px] text-white/60">
                    {selected.contact}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {contactLinks.telHref ? (
                      <a
                        href={contactLinks.telHref}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#38bdf8]/60"
                      >
                        <Phone className="h-3.5 w-3.5 text-[#38bdf8]" />
                        <span>تماس تلفنی</span>
                      </a>
                    ) : null}
                    {contactLinks.mailtoHref ? (
                      <a
                        href={contactLinks.mailtoHref}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#38bdf8]/60"
                      >
                        <Mail className="h-3.5 w-3.5 text-[#c4b5fd]" />
                        <span>ایمیل</span>
                      </a>
                    ) : null}
                    {contactLinks.telegramHref ? (
                      <a
                        href={contactLinks.telegramHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#38bdf8]/60"
                      >
                        <Send className="h-3.5 w-3.5 text-[#38bdf8]" />
                        <span>تلگرام</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    ) : null}
                    {selected.ticketId ? (
                      <Link
                        href={`/admin/support/${selected.ticketId}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#ef1d42]/45 bg-[#ef1d42]/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#ef1d42]/25"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#ff6b81]" />
                        <span>پاسخ در تیکت پشتیبانی</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Admin Management Form */}
              <form
                onSubmit={handleSaveAdminUpdate}
                className="space-y-3.5 border-t border-white/10 pt-4"
              >
                <div>
                  <label
                    htmlFor="admin-ai-status"
                    className="mb-1 block text-xs font-bold text-white/80"
                  >
                    وضعیت درخواست
                  </label>
                  <select
                    id="admin-ai-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as AIProjectStatus)}
                    className="w-full rounded-xl border border-white/15 bg-[#0a0c14] px-3 py-2.5 text-xs font-semibold text-white focus:border-[#38bdf8] focus:outline-none"
                  >
                    {AI_PROJECT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {AI_PROJECT_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="admin-ai-price"
                      className="mb-1 block text-xs font-bold text-white/80"
                    >
                      قیمت پیشنهادی (تومان)
                    </label>
                    <input
                      id="admin-ai-price"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="مثلاً 15000000"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0c14] px-3 py-2.5 text-left text-xs text-white placeholder:text-white/35 focus:border-[#38bdf8] focus:outline-none tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="admin-ai-delivery"
                      className="mb-1 block text-xs font-bold text-white/80"
                    >
                      زمان تحویل تخمینی
                    </label>
                    <input
                      id="admin-ai-delivery"
                      type="text"
                      value={editDelivery}
                      onChange={(e) => setEditDelivery(e.target.value)}
                      placeholder="مثلاً ۷ تا ۱۰ روز کاری"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0c14] px-3 py-2.5 text-xs text-white placeholder:text-white/35 focus:border-[#38bdf8] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-ai-note"
                    className="mb-1 block text-xs font-bold text-white/80"
                  >
                    یادداشت داخلی مدیر
                  </label>
                  <textarea
                    id="admin-ai-note"
                    rows={3}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="جزئیات مذاکره، نیازمندی فنی، تاریخ پیگیری..."
                    className="w-full rounded-xl border border-white/15 bg-[#0a0c14] px-3 py-2 text-xs leading-6 text-white placeholder:text-white/35 focus:border-[#38bdf8] focus:outline-none"
                  />
                </div>

                {saveMsg ? (
                  <div
                    role="status"
                    data-testid="admin-ai-save-success"
                    className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{saveMsg}</span>
                  </div>
                ) : null}

                {saveError ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200"
                  >
                    {saveError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={saving}
                  data-testid="admin-ai-save-btn"
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] px-4 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-55"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'در حال ذخیره...' : 'ذخیره تغییرات درخواست'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-white/50">
              یک درخواست را از فهرست انتخاب کنید تا جزئیات کامل و مدیریت وضعیت آن نمایش داده شود.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
