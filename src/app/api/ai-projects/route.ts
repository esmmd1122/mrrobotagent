import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCustomerSession } from '@/lib/customer-auth/session'
import {
  AI_PROJECT_USAGE_LABELS,
  aiProjectRequestSchema,
  formatContactSummary,
  generateProjectReferenceCode,
  getAIProjectCategory,
  serializeAIProjectPayload,
} from '@/lib/ai-projects'

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'ساختار درخواست نامعتبر است.' },
      { status: 400 },
    )
  }

  const parsed = aiProjectRequestSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json(
      {
        error: firstIssue?.message || 'اطلاعات فرم درخواست پروژه معتبر نیست.',
        field: firstIssue?.path?.[0] ?? null,
      },
      { status: 400 },
    )
  }

  const data = parsed.data
  const category = getAIProjectCategory(data.projectType)
  if (!category) {
    return NextResponse.json(
      { error: 'نوع پروژه انتخاب‌شده معتبر نیست.' },
      { status: 400 },
    )
  }

  try {
    // 1. Associate authenticated customer when logged in, otherwise safely link/create guest contact
    const customerSession = await getCustomerSession()
    let customerId: string | null = null

    if (customerSession?.sub) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { id: customerSession.sub },
        select: { id: true },
      })
      if (existingCustomer) {
        customerId = existingCustomer.id
      }
    }

    if (!customerId) {
      const normalizedEmail = data.contactEmail.trim().toLowerCase() || null
      const normalizedPhone = data.contactPhone.trim() || null

      const matchedCustomer =
        normalizedEmail || normalizedPhone
          ? await prisma.customer.findFirst({
              where: {
                OR: [
                  ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
                  ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
                ],
              },
              select: { id: true },
            })
          : null

      if (matchedCustomer) {
        customerId = matchedCustomer.id
      } else {
        const createdCustomer = await prisma.customer.create({
          data: {
            name: data.contactName,
            email: normalizedEmail,
            phone: normalizedPhone,
          },
          select: { id: true },
        })
        customerId = createdCustomer.id
      }
    }

    // 2. Match existing AIServiceOffering if slug maps closely (optional relation)
    const slugMap: Record<string, string> = {
      'personal-ai-assistant': 'personal-assistant',
      'business-ai-assistant': 'business-assistant',
    }
    const offeringSlug = slugMap[data.projectType]
    const offering = offeringSlug
      ? await prisma.aIServiceOffering.findUnique({
          where: { slug: offeringSlug },
          select: { id: true },
        })
      : null

    const contactSummary = formatContactSummary({
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      contactTelegram: data.contactTelegram,
    })

    const requestTitle = `پروژه هوش مصنوعی: ${category.titleFa}`

    // 3. Create linked SupportTicket so admins can contact/message via existing support workflow
    const ticketSummaryLines = [
      `نوع پروژه: ${category.titleFa} (${category.titleEn})`,
      `نوع استفاده: ${AI_PROJECT_USAGE_LABELS[data.usageScope]}`,
      data.features.length > 0 ? `امکانات درخواستی: ${data.features.join('، ')}` : null,
      data.integrations.length > 0 ? `اتصالات مورد نیاز: ${data.integrations.join('، ')}` : null,
      `عملکرد مورد انتظار:\n${data.expectedFunctionality}`,
      data.additionalDescription ? `توضیحات تکمیلی:\n${data.additionalDescription}` : null,
      `راه‌های ارتباطی: ${contactSummary}`,
    ]
      .filter(Boolean)
      .join('\n\n')

    const ticket = await prisma.supportTicket.create({
      data: {
        customerId,
        subject: requestTitle,
        category: 'AI_PROJECT',
        priority: 'NORMAL',
        status: 'OPEN',
        messages: {
          create: {
            senderType: 'CUSTOMER',
            senderName: data.contactName,
            body: ticketSummaryLines,
          },
        },
      },
      select: { id: true },
    })

    // 4. Create AIServiceRequest (NEVER creates a paid order or payment)
    const createdRequest = await prisma.aIServiceRequest.create({
      data: {
        customerId,
        offeringId: offering?.id ?? null,
        title: requestTitle,
        description: '',
        status: 'NEW',
        delivery: null,
        contact: contactSummary,
      },
      select: { id: true },
    })

    const referenceCode = generateProjectReferenceCode(createdRequest.id)

    const payloadJson = serializeAIProjectPayload({
      __mrrobotAiProjectV1: true,
      referenceCode,
      projectType: category.id,
      projectTypeTitleFa: category.titleFa,
      projectTypeTitleEn: category.titleEn,
      usageScope: data.usageScope,
      features: data.features,
      integrations: data.integrations,
      expectedFunctionality: data.expectedFunctionality,
      additionalDescription: data.additionalDescription,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      contactTelegram: data.contactTelegram,
      ticketId: ticket.id,
      proposedPrice: null,
      estimatedDelivery: '',
      internalNote: '',
    })

    await prisma.aIServiceRequest.update({
      where: { id: createdRequest.id },
      data: { description: payloadJson },
    })

    return NextResponse.json(
      {
        ok: true,
        requestId: createdRequest.id,
        referenceCode,
        ticketId: ticket.id,
        status: 'NEW',
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('[api/ai-projects] Failed to save AI project request:', err)
    return NextResponse.json(
      { error: 'ذخیره درخواست پروژه با خطا مواجه شد. لطفاً دوباره تلاش کنید.' },
      { status: 500 },
    )
  }
}
