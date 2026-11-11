import { getActiveWebsiteConfig } from '@/lib/site-config/service'
import { getVisibleProducts } from '@/lib/catalog'
import { mapStorefrontProduct } from '@/lib/mappers/product'
import { HomePage } from '@/components/home/HomePage'

export default async function Page() {
  const [products, site] = await Promise.all([
    getVisibleProducts().catch(() => []),
    getActiveWebsiteConfig(),
  ])

  return (
    <HomePage
      products={products.map(mapStorefrontProduct)}
      site={site}
    />
  )
}
