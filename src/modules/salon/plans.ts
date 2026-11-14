import { prisma } from '@/lib/db'

const DEFAULTS = [
  {
    slug: 'starter',
    nameFa: 'استارتر',
    monthlyBookingLimit: 80,
    employeeLimit: 3,
    aiTokenLimit: 50000,
    priceToman: 0,
    featuresJson: JSON.stringify(['رزرو آنلاین', 'داشبورد سالن']),
  },
  {
    slug: 'professional',
    nameFa: 'حرفه‌ای',
    monthlyBookingLimit: 400,
    employeeLimit: 12,
    aiTokenLimit: 300000,
    priceToman: 990000,
    featuresJson: JSON.stringify(['رزرو آنلاین', 'دستیار متنی', 'گزارش نوبت']),
  },
  {
    slug: 'business',
    nameFa: 'بیزینس',
    monthlyBookingLimit: 2000,
    employeeLimit: 40,
    aiTokenLimit: 1500000,
    priceToman: 2490000,
    featuresJson: JSON.stringify(['سقف بالاتر', 'چند پرسنل', 'آماده چند شعبه']),
  },
]

export async function ensureSalonPlans() {
  for (const plan of DEFAULTS) {
    await prisma.salonPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    })
  }
  return prisma.salonPlan.findUniqueOrThrow({ where: { slug: 'starter' } })
}
