import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const slug = `conflict-${Date.now()}`

const business = await prisma.salonBusiness.create({
  data: {
    slug,
    name: 'Conflict Test',
    published: true,
    status: 'ACTIVE',
    bufferMinutes: 0,
    slotStepMinutes: 30,
  },
})
const branch = await prisma.salonBranch.create({
  data: { businessId: business.id, name: 'main', isDefault: true },
})
const employee = await prisma.salonEmployee.create({
  data: { businessId: business.id, branchId: branch.id, name: 'A' },
})
const offering = await prisma.salonOffering.create({
  data: {
    businessId: business.id,
    name: 'Cut',
    priceToman: 1000,
    durationMinutes: 60,
  },
})
await prisma.salonEmployeeService.create({
  data: { employeeId: employee.id, offeringId: offering.id },
})
const guest = await prisma.salonGuest.create({
  data: { businessId: business.id, phone: '09120000000' },
})
const start = new Date(Date.now() + 24 * 60 * 60 * 1000)
const end = new Date(start.getTime() + 60 * 60 * 1000)

async function book(reference) {
  return prisma.$transaction(async (tx) => {
    const clash = await tx.salonBooking.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    })
    if (clash) throw new Error('taken')
    return tx.salonBooking.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        employeeId: employee.id,
        offeringId: offering.id,
        guestId: guest.id,
        startTime: start,
        endTime: end,
        status: 'CONFIRMED',
        reference,
        slotKey: `${employee.id}:${start.toISOString()}`,
      },
    })
  })
}

const results = await Promise.allSettled([
  book(`MR${Date.now()}A`),
  book(`MR${Date.now()}B`),
])
const ok = results.filter((r) => r.status === 'fulfilled').length
const count = await prisma.salonBooking.count({ where: { employeeId: employee.id } })
await prisma.salonBusiness.delete({ where: { id: business.id } })
await prisma.$disconnect()
if (ok !== 1 || count !== 1) {
  console.error('concurrent booking failed', results, count)
  process.exit(1)
}
console.log('concurrent booking allowed exactly one row')
