import type { PublicProduct } from '@/lib/catalog'

export type StorefrontProduct = {
  slug: string
  name: string
  nameEn: string
  description: string
  details: string[]
  features: string[]
  price: number | null
  promoPrice: number | null
}

export function mapStorefrontProduct(p: PublicProduct): StorefrontProduct {
  let details: string[] = []
  let features: string[] = []
  try {
    details = JSON.parse(p.detailsJson)
  } catch {
    details = []
  }
  try {
    features = JSON.parse(p.featuresJson)
  } catch {
    features = []
  }
  return {
    slug: p.slug,
    name: p.nameFa,
    nameEn: p.nameEn || p.nameFa,
    description: p.description,
    details,
    features,
    price: p.price,
    promoPrice: p.promoPrice,
  }
}
