'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCart } from '@/components/cart/CartProvider'
import { ChapterRail } from '@/components/cinema/ChapterRail'
import type { CinemaStageHandle } from '@/components/cinema/CinemaStage'
import type { CharacterAssetMetadata } from '@/components/cinema/engine/character/types'
import {
  resolveArtifactKey,
  type ArtifactKey,
} from '@/components/cinema/engine/ProductShowcase3D'
import { GlbModelModal } from '@/components/cinema/GlbModelModal'
import { ServiceRequestModal } from '@/components/cinema/ServiceRequestModal'
import { PageLoader } from '@/components/home/PageLoader'
import { Hero } from '@/components/home/Hero'
import {
  BrandIntroSection,
  FinaleSection,
  ServicesOverviewSection,
  TrustSection,
} from '@/components/home/CinemaSections'
import { SubscriptionsSection } from '@/components/home/SubscriptionsSection'
import { AIServicesSection } from '@/components/home/AIServicesSection'
import { OtherServicesSection } from '@/components/home/OtherServicesSection'
import type { StorefrontProduct } from '@/lib/mappers/product'
import type { WebsiteConfig } from '@/lib/site-config/types'
import type { HomeAIOffering, HomeCategoryItem } from './product-helpers'

const CinemaStage = dynamic(
  () => import('@/components/cinema/CinemaStage').then((m) => m.CinemaStage),
  { ssr: false },
)

type Props = {
  products: StorefrontProduct[]
  categories: HomeCategoryItem[]
  aiOfferings: HomeAIOffering[]
  site: WebsiteConfig
}

export function HomePage({ products, categories, aiOfferings, site }: Props) {
  const { setCinemaBridge, showToast } = useCart()
  const stageRef = useRef<CinemaStageHandle | null>(null)

  const [stageReady, setStageReady] = useState(false)
  const [activeSceneId, setActiveSceneId] = useState('hero')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestSubject, setRequestSubject] = useState('ثبت درخواست مشاوره')
  const [glbOpen, setGlbOpen] = useState(false)
  const [characterMeta, setCharacterMeta] = useState<CharacterAssetMetadata | null>(null)
  const [inspectedSlug, setInspectedSlug] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true)
    }
  }, [])

  const toggleReducedMotion = useCallback(() => {
    setReducedMotion((prev) => {
      const next = !prev
      showToast(next ? 'حالت حرکت آرام فعال شد' : 'حالت حرکت سینمایی کامل فعال شد')
      return next
    })
  }, [showToast])

  const openGlbModal = useCallback(() => {
    setGlbOpen(true)
  }, [])

  // Register live Cinema controls into global Navbar bridge while on homepage
  useEffect(() => {
    setCinemaBridge({
      isCinemaHome: true,
      activeChapterId: activeSceneId,
      reducedMotion,
      toggleReducedMotion,
      openGlbModal,
    })
    return () => {
      setCinemaBridge(null)
    }
  }, [activeSceneId, reducedMotion, toggleReducedMotion, openGlbModal, setCinemaBridge])

  const handleOpenRequest = useCallback((subject: string) => {
    setRequestSubject(subject)
    setRequestOpen(true)
  }, [])

  const handleSelectArtifact = useCallback((key: ArtifactKey) => {
    stageRef.current?.setArtifact(key)
  }, [])

  const handleDragArtifact = useCallback((deltaX: number) => {
    stageRef.current?.applyProductDrag(deltaX)
  }, [])

  const handlePulseEyes = useCallback(() => {
    stageRef.current?.pulseCharacterEyes(5.4)
  }, [])

  const handleInspectProduct = useCallback((product: StorefrontProduct) => {
    setInspectedSlug(product.slug)
    stageRef.current?.setArtifact(
      resolveArtifactKey(product.slug, product.categorySlug, product.nameEn),
    )
  }, [])

  const initialArtifact: ArtifactKey = products[0]
    ? resolveArtifactKey(
        products[0].slug,
        products[0].categorySlug,
        products[0].nameEn,
      )
    : 'aiCore'

  return (
    <div className="mr-cinema-shell">
      <PageLoader ready={stageReady} />

      <CinemaStage
        ref={stageRef}
        reducedMotion={reducedMotion}
        initialArtifact={initialArtifact}
        onActiveSceneChange={(_idx, id) => setActiveSceneId(id)}
        onReady={() => setStageReady(true)}
        onCharacterMetaChange={setCharacterMeta}
      />

      <ChapterRail
        activeSceneId={activeSceneId}
        reducedMotion={reducedMotion}
      />

      <div className="cinema-story-main">
        {/* Scene 01: Hero */}
        <Hero
          hero={site.hero}
          productCount={products.length}
          categoryCount={categories.length}
          onOpenRequest={handleOpenRequest}
        />

        {/* Scene 02: Brand Intro */}
        <BrandIntroSection />

        {/* Scene 03: Services Showcase */}
        <ServicesOverviewSection
          products={products}
          onInspectProduct={handleInspectProduct}
          onOpenRequest={handleOpenRequest}
        />

        {/* Scene 04: Interactive 3D Marketplace */}
        <SubscriptionsSection
          products={products}
          categories={categories}
          selectedProductSlug={inspectedSlug}
          onSelectArtifact={handleSelectArtifact}
          onDragArtifact={handleDragArtifact}
          onOpenRequest={handleOpenRequest}
        />

        {/* Scene 05: AI Technology Experience */}
        <AIServicesSection
          offerings={aiOfferings}
          products={products}
          onPulseEyes={handlePulseEyes}
          onOpenRequest={handleOpenRequest}
        />

        {/* Scene 06: Apple & Mobile Services */}
        <OtherServicesSection
          products={products}
          onOpenRequest={handleOpenRequest}
        />

        {/* Scene 07: Trust, Support & Transparency */}
        <TrustSection
          productCount={products.length}
          onOpenRequest={handleOpenRequest}
        />

        {/* Scene 08: Final Brand Finale */}
        <FinaleSection onOpenRequest={handleOpenRequest} />
      </div>

      <ServiceRequestModal
        open={requestOpen}
        subjectTitle={requestSubject}
        onClose={() => setRequestOpen(false)}
      />

      <GlbModelModal
        open={glbOpen}
        characterMeta={characterMeta}
        onClose={() => setGlbOpen(false)}
        onLoadGlbFile={async (blobUrl, fileName) => {
          if (!stageRef.current) {
            throw new Error('Stage not ready')
          }
          await stageRef.current.loadOfficialGlb(blobUrl, fileName)
        }}
        onPlayClip={(clipName) => {
          stageRef.current?.playAnimationClip(clipName)
        }}
        onResetDefault={() => {
          stageRef.current?.resetCharacter()
        }}
      />
    </div>
  )
}
