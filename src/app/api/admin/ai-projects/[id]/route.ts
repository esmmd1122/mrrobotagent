import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminApi } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { logActivity } from '@/lib/activity'
import {
  adminUpdateAiProjectSchema,
  formatDeliverySummary,
  generateProjectReferenceCode,
  getAIProjectCategory,
  parseAIProjectRecord,
  serializeAIProjectPayload,
  type StoredAIProjectPayload,
} from '@/lib/ai-projects'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(PERMISSIONS.AI_MANAGE)
  if (auth.error === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'لطفاً وارد پنل مدیریت شوید.' }, { status: 401 })
  }
  if (auth.error === 'FORBIDDEN' || !auth.session) {
    return NextResponse.json({ error: 'دسترسی مدیریت پروژه‌های AI ندارید.' }, { status: 403 })
  }

  const { id } = await context.params
  if (!id || id.length > 100) {
    return NextResponse.json({ error: 'شناسه درخواست نامعتبر است.' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'فرمت درخواست نامعتبر است.' }, { status: 400 })
  }

  const parsedInput = adminUpdateAiProjectSchema.safeParse(body)
  if (!parsedInput.success) {
    return NextResponse.json(
      { error: parsedInput.error.issues[0]?.message || 'مقادیر ارسالی نامعتبر است.' },
      { status: 400 },
    )
  }

  const existing = await prisma.aIServiceRequest.findUnique({
    where: { id },
    include: { customer: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'درخواست مورد نظر یافت نشد.' }, { status: 404 })
  }

  const parsedExisting = parseAIProjectRecord(existing)
  const proposedPrice =
    parsedInput.data.proposedPrice === undefined
      ? parsedExisting.proposedPrice
      : parsedInput.data.proposedPrice
  const estimatedDelivery = parsedInput.data.estimatedDelivery
  const internalNote = parsedInput.data.internalNote

  const fallbackCategory =
    (parsedExisting.projectType && getAIProjectCategory(parsedExisting.projectType)) || null

  const updatedPayload: StoredAIProjectPayload = {
    __mrrobotAiProjectV1: true,
    referenceCode: parsedExisting.referenceCode || generateProjectReferenceCode(existing.id),
    projectType: fallbackCategory?.id ?? 'business-ai-assistant',
    projectTypeTitleFa: parsedExisting.projectTypeTitleFa || existing.title,
    projectTypeTitleEn: fallbackCategory?.titleEn ?? 'Custom AI Project',
    usageScope: parsedExisting.usageScope ?? 'BUSINESS',
    features: parsedExisting.features,
    integrations: parsedExisting.integrations,
    expectedFunctionality: parsedExisting.expectedFunctionality,
    additionalDescription: parsedExisting.additionalDescription,
    contactName: parsedExisting.contactName,
    contactPhone: parsedExisting.contactPhone,
    contactEmail: parsedExisting.contactEmail,
    contactTelegram: parsedExisting.contactTelegram,
    ticketId: parsedExisting.ticketId,
    proposedPrice: proposedPrice ?? null,
    estimatedDelivery,
    internalNote,
    updatedByAdmin: auth.session.name,
    updatedAt: new Date().toISOString(),
  }

  const deliverySummary = formatDeliverySummary(proposedPrice, estimatedDelivery)

  const updated = await prisma.aIServiceRequest.update({
    where: { id },
    data: {
      status: parsedInput.data.status,
      delivery: deliverySummary,
      description: serializeAIProjectPayload(updatedPayload),
    },
    include: { customer: true },
  })

  await logActivity({
    adminId: auth.session.sub,
    action: 'ai_project.update',
    entity: 'AIServiceRequest',
    entityId: id,
    metadata: {
      status: parsedInput.data.status,
      proposedPrice: proposedPrice ?? null,
      estimatedDelivery,
    },
  })

  return NextResponse.json({
    ok: true,
    request: parseAIProjectRecord(updated),
  })
}
