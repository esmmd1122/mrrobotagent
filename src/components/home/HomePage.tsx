'use client'

import { PageLoader } from '@/components/home/PageLoader'
import { Hero } from '@/components/home/Hero'
import { SubscriptionsSection } from '@/components/home/SubscriptionsSection'
import { AIServicesSection } from '@/components/home/AIServicesSection'
import { OtherServicesSection } from '@/components/home/OtherServicesSection'

export function HomePage() {
  return (
    <>
      <PageLoader />
      <Hero />
      <SubscriptionsSection />
      <AIServicesSection />
      <OtherServicesSection />
    </>
  )
}
