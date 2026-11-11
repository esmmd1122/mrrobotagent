import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { replyTicket } from '../actions'

type Props = { params: Promise<{ id: string }> }

export default async function SupportDetailPage({ params }: Props) {
  await requireAdmin(PERMISSIONS.SUPPORT_MANAGE)
  const { id } = await params
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { customer: true, messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!ticket) notFound()

  const action = replyTicket.bind(null, id)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{ticket.subject}</h1>
      <div className="admin-card space-y-3 p-4">
        {ticket.messages.map((m) => (
          <div key={m.id} className="rounded-lg border border-[#2a2b35] p-3 text-sm">
            <p className="text-xs text-white/45">
              {m.senderName} ({m.senderType})
            </p>
            <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
      </div>
      <form action={action} className="admin-card max-w-xl space-y-3 p-4">
        <textarea name="body" className="admin-input min-h-24" placeholder="پاسخ مدیر" required />
        <select name="status" defaultValue={ticket.status} className="admin-input">
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue={ticket.priority} className="admin-input">
          {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-[#e10600] px-4 py-2 text-sm font-semibold">
          ارسال پاسخ
        </button>
      </form>
    </div>
  )
}
