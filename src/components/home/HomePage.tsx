'use client'

import { PageLoader } from '@/components/home/PageLoader'
import { Hero } from '@/components/home/Hero'
import { SubscriptionsSection } from '@/components/home/SubscriptionsSection'
import { AIServicesSection } from '@/components/home/AIServicesSection'
import { OtherServicesSection } from '@/components/home/OtherServicesSection'
import type { StorefrontProduct } from '@/lib/mappers/product'
import type { WebsiteConfig } from '@/lib/site-config/types'

type Props = {
  products: StorefrontProduct[]
  site: WebsiteConfig
}

export function HomePage({ products, site }: Props) {
  const sections = [...site.sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <>
      <PageLoader />
      <Hero hero={site.hero} />
      {sections.map((section) => {
        if (section.id === 'subscriptions') {
          return (
            <SubscriptionsSection
              key={section.id}
              products={products}
              title={section.title}
              description={section.description}
            />
          )
        }
        if (section.id === 'ai') {
          return (
            <AIServicesSection
              key={section.id}
              title={section.title}
              description={section.description}
            />
          )
        }
        return (
          <OtherServicesSection
            key={section.id}
            title={section.title}
            description={section.description}
          />
        )
      })}
    </>
  )
}
