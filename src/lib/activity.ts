import { prisma } from '@/lib/db'

export async function logActivity(input: {
  adminId?: string
  action: string
  entity?: string
  entityId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}) {
  await prisma.activityLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      ipAddress: input.ipAddress,
    },
  })
}
