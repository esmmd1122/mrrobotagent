import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const rows = await prisma.salonBusiness.findMany({
  include: { offerings: true, employees: true, bookings: true, hours: true },
})
for (const x of rows) {
  console.log({
    name: x.name,
    slug: x.slug,
    published: x.published,
    services: x.offerings.length,
    employees: x.employees.length,
    bookings: x.bookings.length,
    hours: x.hours.length,
  })
}
await prisma.$disconnect()
