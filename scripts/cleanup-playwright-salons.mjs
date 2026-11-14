import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const result = await prisma.salonBusiness.deleteMany({
  where: { OR: [{ slug: { startsWith: 'pw' } }, { slug: { startsWith: 'diag' } }, { name: 'تشخیص' }] },
})
console.log(`removed test salons: ${result.count}`)
await prisma.$disconnect()
