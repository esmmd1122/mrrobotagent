import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const stamp = Date.now()

const first = await prisma.salonBusiness.create({
  data: { slug: `iso-a-${stamp}`, name: 'A', published: true },
})
const second = await prisma.salonBusiness.create({
  data: { slug: `iso-b-${stamp}`, name: 'B', published: true },
})
const branch = await prisma.salonBranch.create({
  data: { businessId: first.id, name: 'main', isDefault: true },
})
const employee = await prisma.salonEmployee.create({
  data: { businessId: first.id, branchId: branch.id, name: 'A' },
})
const offering = await prisma.salonOffering.create({
  data: { businessId: first.id, name: 'Cut', priceToman: 1, durationMinutes: 30 },
})
const guest = await prisma.salonGuest.create({
  data: { businessId: first.id, phone: '09121111111' },
})
const booking = await prisma.salonBooking.create({
  data: {
    businessId: first.id,
    branchId: branch.id,
    employeeId: employee.id,
    offeringId: offering.id,
    guestId: guest.id,
    startTime: new Date(Date.now() + 86400000),
    endTime: new Date(Date.now() + 86400000 + 1800000),
    status: 'CONFIRMED',
    reference: `ISO${stamp}`,
    slotKey: `${employee.id}:iso-${stamp}`,
  },
})

const crossed = await prisma.salonBooking.updateMany({
  where: { id: booking.id, businessId: second.id },
  data: { status: 'CANCELLED' },
})
const still = await prisma.salonBooking.findUnique({ where: { id: booking.id } })
const foreignGuest = await prisma.salonBooking.findFirst({
  where: { id: booking.id, businessId: second.id, guest: { phone: guest.phone } },
})

await prisma.salonBusiness.delete({ where: { id: first.id } })
await prisma.salonBusiness.delete({ where: { id: second.id } })
await prisma.$disconnect()

if (crossed.count !== 0 || still?.status !== 'CONFIRMED' || foreignGuest) {
  console.error('cross-tenant check failed', crossed.count, still?.status, Boolean(foreignGuest))
  process.exit(1)
}
console.log('cross-tenant update and read returned no foreign access')
