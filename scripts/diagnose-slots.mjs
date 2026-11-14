import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const business = await prisma.salonBusiness.findFirst({
  where: { name: 'تشخیص' },
  include: { offerings: { include: { employees: true } }, employees: { include: { hours: true } }, hours: true },
})
if (!business) {
  console.log('no diagnostic salon')
} else {
  console.log(JSON.stringify({
    slug: business.slug,
    published: business.published,
    hours: business.hours.length,
    employees: business.employees.map((employee) => ({ name: employee.name, hours: employee.hours.length })),
    offerings: business.offerings.map((offering) => ({ id: offering.id, name: offering.name, staff: offering.employees.length, minutes: offering.durationMinutes })),
  }, null, 2))
  if (!business.published) {
    await prisma.salonBusiness.update({ where: { id: business.id }, data: { published: true } })
    console.log('published for slot check', business.slug)
  }
}
await prisma.$disconnect()
