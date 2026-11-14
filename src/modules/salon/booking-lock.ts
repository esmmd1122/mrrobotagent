import { Prisma } from '@prisma/client'

export function isPostgresUrl(url = process.env.DATABASE_URL || '') {
  return url.startsWith('postgres://') || url.startsWith('postgresql://')
}

export async function lockBookingSlot(
  tx: Prisma.TransactionClient,
  employeeId: string,
  startIso: string,
) {
  if (!isPostgresUrl()) return
  let hash = 0
  const text = `${employeeId}:${startIso}`
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash, 31) + text.charCodeAt(i)
  }
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${hash})`
}

export function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
