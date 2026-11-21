'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { MrRobotChatPanel } from '@/components/ai/MrRobotChatPanel'
import type { AssistantAnimState } from '@/components/cinema/engine/character/assistant-state'
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
import { normalizeSections } from '@/lib/site-config/cms-helpers'
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
  const [chatOpen, setChatOpen] = useState(false)
  const [assistantState, setAssistantState] = useState<AssistantAnimState>('idle')

  // Order products prioritizing CMS-selected featuredProductSlugs while keeping all real products
  const orderedProducts = useMemo(() => {
    const featuredSlugs = site.hero.featuredProductSlugs ?? []
    if (featuredSlugs.length === 0) return products
    const priority = new Map<string, number>()
    featuredSlugs.forEach((slug, idx) => priority.set(slug, idx))
    return [...products].sort((a, b) => {
      const pa = priority.has(a.slug) ? priority.get(a.slug)! : Number.MAX_SAFE_INTEGER
      const pb = priority.has(b.slug) ? priority.get(b.slug)! : Number.MAX_SAFE_INTEGER
      return pa - pb
    })
  }, [products, site.hero.featuredProductSlugs])

  const orderedSections = useMemo(
    () => normalizeSections(site.sections),
    [site.sections],
  )

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

  const handleOpenAssistant = useCallback(() => {
    stageRef.current?.triggerCharacterAttention(1.35)
    setChatOpen(true)
  }, [])

  const handleCloseAssistant = useCallback(() => {
    setChatOpen(false)
    setAssistantState('idle')
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

  const initialArtifact: ArtifactKey = orderedProducts[0]
    ? resolveArtifactKey(
        orderedProducts[0].slug,
        orderedProducts[0].categorySlug,
        orderedProducts[0].nameEn,
      )
    : 'aiCore'

  return (
    <div className="mr-cinema-shell">
      <PageLoader ready={stageReady} />

      <CinemaStage
        ref={stageRef}
        reducedMotion={reducedMotion}
        initialArtifact={initialArtifact}
        chatOpen={chatOpen}
        assistantState={assistantState}
        onActiveSceneChange={(_idx, id) => setActiveSceneId(id)}
        onReady={() => setStageReady(true)}
        onCharacterMetaChange={setCharacterMeta}
        onCharacterClick={handleOpenAssistant}
      />

      <ChapterRail
        activeSceneId={activeSceneId}
        reducedMotion={reducedMotion}
      />

      <div className="cinema-story-main">
        {/* Scene 01: Hero */}
        {site.hero.enabled !== false ? (
          <Hero
            hero={site.hero}
            productCount={orderedProducts.length}
            categoryCount={categories.length}
            onOpenRequest={handleOpenRequest}
          />
        ) : null}

        {/* CMS-controlled Sections rendered in configured sortOrder */}
        {orderedSections
          .filter((sec) => sec.enabled)
          .map((sec) => {
            switch (sec.id) {
              case 'intro':
                return (
                  <BrandIntroSection
                    key={sec.id}
                    title={sec.title}
                    description={sec.description}
                    imageUrl={sec.imageUrl}
                    imageAlt={sec.imageAlt}
                  />
                )
              case 'services':
                return (
                  <ServicesOverviewSection
                    key={sec.id}
                    products={orderedProducts}
                    title={sec.title}
                    description={sec.description}
                    imageUrl={sec.imageUrl}
                    imageAlt={sec.imageAlt}
                    onInspectProduct={handleInspectProduct}
                    onOpenRequest={handleOpenRequest}
                  />
                )
              case 'subscriptions':
                return (
                  <SubscriptionsSection
                    key={sec.id}
                    products={orderedProducts}
                    categories={categories}
                    title={sec.title}
                    description={sec.description}
                    imageUrl={sec.imageUrl}
                    imageAlt={sec.imageAlt}
                    selectedProductSlug={inspectedSlug}
                    onSelectArtifact={handleSelectArtifact}
                    onDragArtifact={handleDragArtifact}
                    onOpenRequest={handleOpenRequest}
                  />
                )
              case 'ai':
                return (
                  <AIServicesSection
                    key={sec.id}
                    offerings={aiOfferings}
                    products={orderedProducts}
                    title={sec.title}
                    description={sec.description}
                    imageUrl={sec.imageUrl}
                    imageAlt={sec.imageAlt}
                    onPulseEyes={handlePulseEyes}
                    onOpenRequest={handleOpenRequest}
                    onOpenAssistant={handleOpenAssistant}
                  />
                )
              case 'other':
                return (
                  <OtherServicesSection
                    key={sec.id}
                    products={orderedProducts}
                    title={sec.title}
                    description={sec.description}
                    imageUrl={sec.imageUrl}
                    imageAlt={sec.imageAlt}
                    onOpenRequest={handleOpenRequest}
                  />
                )
              case 'trust':
                return (
                  <TrustSection
                    key={sec.id}
                    productCount={orderedProducts.length}
                    title={sec.title}
                    description={sec.description}
                    imageUrl={sec.imageUrl}
                    imageAlt={sec.imageAlt}
                    onOpenRequest={handleOpenRequest}
                  />
                )
              case 'finale':
                return (
                  <FinaleSection
                    key={sec.id}
                    title={sec.title}
                    description={sec.description}
                    imageUrl={sec.imageUrl}
                    imageAlt={sec.imageAlt}
                    onOpenRequest={handleOpenRequest}
                  />
                )
              default:
                return null
            }
          })}
      </div>

      <MrRobotChatPanel
        open={chatOpen}
        assistantState={assistantState}
        onOpen={handleOpenAssistant}
        onClose={handleCloseAssistant}
        onAssistantStateChange={setAssistantState}
      />

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
