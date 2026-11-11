'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

const replySchema = z.object({
  body: z.string().min(2).max(5000),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
})

export async function replyTicket(ticketId: string, formData: FormData) {
  const session = await requireAdmin(PERMISSIONS.SUPPORT_MANAGE)
  const parsed = replySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('ورودی نامعتبر')

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId,
        senderType: 'ADMIN',
        senderName: session.name,
        body: parsed.data.body,
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: parsed.data.status, priority: parsed.data.priority },
    }),
  ])

  await logActivity({
    adminId: session.sub,
    action: 'support.reply',
    entity: 'SupportTicket',
    entityId: ticketId,
  })

  revalidatePath(`/admin/support/${ticketId}`)
}
