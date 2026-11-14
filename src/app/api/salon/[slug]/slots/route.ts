import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { listSlots } from '@/modules/salon/engine'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  const business = await prisma.salonBusiness.findUnique({ where: { slug } })
  if (!business || !business.published || business.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'سالن یافت نشد' }, { status: 404 })
  }
  const url = new URL(req.url)
  const offeringId = url.searchParams.get('offeringId') || ''
  const employeeId = url.searchParams.get('employeeId')
  const date = url.searchParams.get('date') || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'تاریخ نامعتبر است' }, { status: 400 })
  }
  const slots = await listSlots({
    businessId: business.id,
    offeringId,
    employeeId,
    ymd: date,
  })
  return NextResponse.json({ slots })
}
