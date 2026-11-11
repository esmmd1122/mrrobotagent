import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const schema = z.object({
  name: z.string().min(2).max(120),
  contact: z.string().min(3).max(200),
  subject: z.string().max(200).optional(),
  message: z.string().min(5).max(5000),
})

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'فرم نامعتبر است.' }, { status: 400 })
  }

  const { name, contact, subject, message } = parsed.data

  const customer = await prisma.customer.create({
    data: { name, phone: contact.includes('@') ? null : contact, email: contact.includes('@') ? contact : null },
  })

  const ticket = await prisma.supportTicket.create({
    data: {
      customerId: customer.id,
      subject: subject || 'درخواست جدید از وب‌سایت',
      category: 'WEBSITE',
      priority: 'NORMAL',
      status: 'OPEN',
      messages: {
        create: {
          senderType: 'CUSTOMER',
          senderName: name,
          body: message,
        },
      },
    },
  })

  if (subject?.includes('درخواست:')) {
    await prisma.aIServiceRequest.create({
      data: {
        customerId: customer.id,
        title: subject,
        description: message,
        contact,
        status: 'NEW',
      },
    })
  }

  return NextResponse.json({ ok: true, ticketId: ticket.id })
}
