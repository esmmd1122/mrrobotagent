import type { PublicProduct } from '@/lib/catalog'
import { parseStringListJson } from '@/lib/product-list-fields'

export type StorefrontProductPlan = {
  id: string
  title: string
  durationValue: number | null
  durationUnit: string | null
  price: number
  promoPrice: number | null
  isActive: boolean
  isFeatured: boolean
}

export type StorefrontProduct = {
  id: string
  slug: string
  name: string
  nameEn: string
  description: string
  imageUrl: string | null
  isAvailable: boolean
  isFeatured: boolean
  details: string[]
  features: string[]
  price: number | null
  promoPrice: number | null
  currency: string
  categorySlug: string | null
  categoryNameFa: string | null
  plansEnabled: boolean
  activePlans: StorefrontProductPlan[]
}

export function mapStorefrontProduct(p: PublicProduct): StorefrontProduct {
  const details = parseStringListJson(p.detailsJson)
  const features = parseStringListJson(p.featuresJson)
  return {
    id: p.id,
    slug: p.slug,
    name: p.nameFa,
    nameEn: p.nameEn || p.nameFa,
    description: p.description,
    imageUrl: p.imageUrl ?? null,
    isAvailable: p.isAvailable,
    isFeatured: p.isFeatured,
    details,
    features,
    price: p.price,
    promoPrice: p.promoPrice,
    currency: p.currency || 'TOMAN',
    categorySlug: p.category?.slug ?? null,
    categoryNameFa: p.category?.nameFa ?? null,
    plansEnabled: p.plansEnabled,
    activePlans: (p.plans ?? []).map((pl) => ({
      id: pl.id,
      title: pl.title,
      durationValue: pl.durationValue,
      durationUnit: pl.durationUnit,
      price: pl.price,
      promoPrice: pl.promoPrice,
      isActive: pl.isActive,
      isFeatured: pl.isFeatured,
    })),
  }
}
