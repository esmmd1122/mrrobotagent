import { prisma } from '@/lib/db'
import { hashPassword } from './auth'
import { ensureSalonPlans } from './plans'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function registerSalon(input: {
  salonName: string
  slug: string
  category: string
  ownerName: string
  email: string
  password: string
}) {
  const slug = input.slug.trim().toLowerCase()
  if (!SLUG.test(slug)) throw new Error('شناسه سالن فقط حروف انگلیسی کوچک و خط تیره باشد')
  if (input.password.length < 8) throw new Error('رمز حداقل ۸ کاراکتر باشد')
  const taken = await prisma.salonBusiness.findUnique({ where: { slug } })
  if (taken) throw new Error('این آدرس رزرو قبلاً استفاده شده است')
  const plan = await ensureSalonPlans()
  const passwordHash = await hashPassword(input.password)
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  return prisma.$transaction(async (tx) => {
    const business = await tx.salonBusiness.create({
      data: {
        name: input.salonName.trim(),
        slug,
        category: input.category,
        published: false,
      },
    })
    const branch = await tx.salonBranch.create({
      data: { businessId: business.id, name: 'شعبه اصلی', isDefault: true },
    })
    await tx.salonMembership.create({
      data: {
        businessId: business.id,
        email: input.email.trim().toLowerCase(),
        passwordHash,
        name: input.ownerName.trim(),
        role: 'OWNER',
      },
    })
    await tx.salonSubscription.create({
      data: {
        businessId: business.id,
        planId: plan.id,
        periodStart: now,
        periodEnd,
      },
    })
    for (let day = 0; day < 7; day += 1) {
      await tx.salonBusinessHour.create({
        data: {
          businessId: business.id,
          dayOfWeek: day,
          startTime: '10:00',
          endTime: '20:00',
          closed: false,
        },
      })
    }
    await tx.salonAudit.create({
      data: { businessId: business.id, actor: input.email, action: 'business.register' },
    })
    return { business, branch }
  })
}
