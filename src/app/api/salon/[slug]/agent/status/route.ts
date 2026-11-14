import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAgentRuntimeStatus } from '@/modules/salon/ai/agent-status'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  const business = await prisma.salonBusiness.findUnique({ where: { slug } })
  if (!business || !business.published || business.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'سالن یافت نشد' }, { status: 404 })
  }
  const status = await getAgentRuntimeStatus(business.id)
  return NextResponse.json({
    displayName: (await prisma.salonAgentConfig.findUnique({ where: { businessId: business.id } }))?.displayName
      || 'دستیار سالن',
    ...status,
  })
}
