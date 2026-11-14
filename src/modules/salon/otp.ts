import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { devRevealAllowed, rateLimit } from './otp-policy'

export { rateLimit }

export type SmsProvider = {
  name: string
  send(phone: string, message: string): Promise<void>
}

export function getSmsProvider(): SmsProvider | null {
  if (!process.env.SMS_PROVIDER_URL || !process.env.SMS_PROVIDER_TOKEN) return null
  return {
    name: 'http',
    async send(phone, message) {
      const res = await fetch(process.env.SMS_PROVIDER_URL as string, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SMS_PROVIDER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: phone, text: message }),
      })
      if (!res.ok) throw new Error('SMS_FAILED')
    },
  }
}

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '')
  if (digits.startsWith('98') && digits.length === 12) return `0${digits.slice(2)}`
  if (digits.length === 10 && digits.startsWith('9')) return `0${digits}`
  return digits
}

export function isIranMobile(phone: string) {
  return /^09\d{9}$/.test(phone)
}

export async function issueOtp(businessId: string, phone: string, purpose: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const codeHash = await bcrypt.hash(code, 8)
  await prisma.salonOtp.create({
    data: {
      businessId,
      phone,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  })

  const reveal = devRevealAllowed()
  const sms = getSmsProvider()
  if (sms) {
    await sms.send(phone, `کد تایید MR.ROBOT AI: ${code}`)
    return { channel: sms.name as 'http' | 'dev', devCode: null as string | null }
  }
  if (reveal) {
    return { channel: 'dev' as const, devCode: code }
  }
  throw new Error('SMS_NOT_CONFIGURED')
}

export async function consumeOtp(
  businessId: string,
  phone: string,
  purpose: string,
  code: string,
) {
  const row = await prisma.salonOtp.findFirst({
    where: {
      businessId,
      phone,
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (!row) return false
  if (row.attempts >= 5) return false
  const ok = await bcrypt.compare(code, row.codeHash)
  if (!ok) {
    await prisma.salonOtp.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    })
    return false
  }
  await prisma.salonOtp.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  })
  return true
}
