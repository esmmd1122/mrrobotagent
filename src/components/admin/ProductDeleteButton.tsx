'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { archiveProduct, deleteProductAction } from '@/app/admin/(protected)/products/actions'

type Props = {
  productId: string
  productName: string
  redirectAfter?: string
  compact?: boolean
}

export function ProductDeleteButton({
  productId,
  productName,
  redirectAfter,
  compact = false,
}: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [canArchiveInstead, setCanArchiveInstead] = useState(false)

  function handleConfirmDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteProductAction(productId)
      if (!res.ok) {
        setError(res.error || 'حذف محصول انجام نشد.')
        setCanArchiveInstead(Boolean(res.hasOrders))
        return
      }
      setConfirming(false)
      if (redirectAfter) {
        router.push(redirectAfter)
      }
      router.refresh()
    })
  }

  function handleArchive() {
    setError(null)
    startTransition(async () => {
      await archiveProduct(productId)
      setConfirming(false)
      setCanArchiveInstead(false)
      if (redirectAfter) {
        router.push(redirectAfter)
      }
      router.refresh()
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={
          compact
            ? 'inline-flex items-center gap-1 rounded border border-red-500/35 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/20'
            : 'inline-flex items-center gap-2 rounded-lg border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20'
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>حذف</span>
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-red-500/45 bg-[#1a0d11] p-3 text-xs text-red-100">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <p className="leading-relaxed">
          آیا از حذف محصول <strong className="text-white">«{productName}»</strong> مطمئن هستید؟ این عملیات قابل بازگشت نیست.
        </p>
      </div>

      {error ? <p className="mt-2 text-amber-200">{error}</p> : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {!canArchiveInstead ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleConfirmDelete}
            className="rounded bg-[#e10600] px-3 py-1.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? 'در حال حذف...' : 'بله، حذف شود'}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={handleArchive}
            className="rounded bg-amber-600 px-3 py-1.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? 'در حال آرشیو...' : 'آرشیو و مخفی کردن محصول'}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirming(false)
            setError(null)
            setCanArchiveInstead(false)
          }}
          className="rounded border border-white/15 px-3 py-1.5 text-white/80 hover:bg-white/5"
        >
          انصراف
        </button>
      </div>
    </div>
  )
}
