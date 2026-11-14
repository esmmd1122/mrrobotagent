import { prisma } from '@/lib/db'

export async function getVisibleProducts() {
  return prisma.product.findMany({
    where: { isVisible: true, isAvailable: true },
    include: {
      category: true,
      plans: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function getProductBySlugFromDb(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isVisible: true },
    include: {
      category: true,
      plans: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  })
}

export async function getProductCategories() {
  return prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      products: {
        where: { isVisible: true, isAvailable: true },
        orderBy: [{ sortOrder: 'asc' }, { nameFa: 'asc' }],
        include: { plans: { where: { isActive: true } } },
      },
    },
  })
}

export async function getSiteContentValue<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.siteContent.findUnique({ where: { key } })
  if (!row) return fallback
  try {
    return JSON.parse(row.valueJson) as T
  } catch {
    return fallback
  }
}

export type PublicProduct = Awaited<ReturnType<typeof getVisibleProducts>>[number]
