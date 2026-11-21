import { getActiveWebsiteConfig } from '@/lib/site-config/service'
import { getProductCategories, getVisibleProducts } from '@/lib/catalog'
import { mapStorefrontProduct } from '@/lib/mappers/product'
import { prisma } from '@/lib/db'
import { HomePage } from '@/components/home/HomePage'

export default async function Page() {
  const [products, categories, aiOfferings, site] = await Promise.all([
    getVisibleProducts().catch(() => []),
    getProductCategories().catch(() => []),
    prisma.aIServiceOffering
      .findMany({
        where: { isAvailable: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
      .catch(() => []),
    getActiveWebsiteConfig(),
  ])

  const mappedCategories = categories
    .filter((c) => c.products.length > 0)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      nameFa: c.nameFa,
      description: null,
      productCount: c.products.length,
    }))

  const mappedAiOfferings = aiOfferings.map((o) => ({
    id: o.id,
    slug: o.slug,
    titleFa: o.titleFa,
    description: o.description,
    useCase: o.useCase,
    price: o.price,
  }))

  return (
    <HomePage
      products={products.map(mapStorefrontProduct)}
      categories={mappedCategories}
      aiOfferings={mappedAiOfferings}
      site={site}
    />
  )
}
