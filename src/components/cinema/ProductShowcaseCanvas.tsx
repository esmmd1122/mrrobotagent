'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RotateCcw } from 'lucide-react'
import { createStudioEnvironmentMap } from './engine/textures'
import {
  clampShowcaseRotation,
  computeCoverUvTransform,
  resolveProductMonogram,
  resolveShowcaseAccentHex,
} from './engine/product-showcase-helpers'

export type ShowcaseProductItem = {
  id: string
  slug: string
  name: string
  nameEn: string
  categorySlug: string | null
  categoryNameFa: string | null
  imageUrl: string | null
  priceLabel: string
}

type Props = {
  product: ShowcaseProductItem
  reducedMotion: boolean
}

const DISPLAY_WIDTH = 2.52
const DISPLAY_HEIGHT = 1.575
const DISPLAY_ASPECT = DISPLAY_WIDTH / DISPLAY_HEIGHT

/**
 * Generates a crisp high-resolution studio product plate texture when a product
 * has no uploaded image yet or if the remote image fails to load.
 */
function createFallbackProductTexture(
  product: ShowcaseProductItem,
  accentHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const width = 1280
  const height = 800
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Deep obsidian architectural studio backdrop
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.36, 40, width * 0.5, height * 0.5, width * 0.72)
  bg.addColorStop(0, '#141c2f')
  bg.addColorStop(0.55, '#0b101d')
  bg.addColorStop(1, '#06080f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // Subtle architectural hairline grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)'
  ctx.lineWidth = 1
  for (let x = 80; x < width; x += 80) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 80; y < height; y += 80) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Soft studio spotlight halo behind central emblem
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.42, 10, width * 0.5, height * 0.42, 260)
  glow.addColorStop(0, `${accentHex}38`)
  glow.addColorStop(0.6, `${accentHex}10`)
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  // Top-left MR.ROBOT studio mark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.48)'
  ctx.font = '700 22px "Space Grotesk", system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('MR.ROBOT // DIGITAL STORE', 64, 66)

  // Top-right accent hairline
  ctx.fillStyle = accentHex
  ctx.fillRect(width - 144, 62, 80, 4)

  // Center brushed emblem container
  const badgeW = 216
  const badgeH = 216
  const badgeX = (width - badgeW) / 2
  const badgeY = height * 0.21
  ctx.fillStyle = 'rgba(8, 12, 22, 0.92)'
  ctx.strokeStyle = `${accentHex}88`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 32)
  ctx.fill()
  ctx.stroke()

  // Monogram inside emblem
  const monogram = resolveProductMonogram(product.nameEn, product.name)
  ctx.fillStyle = '#f8fafc'
  ctx.font = '800 84px "Space Grotesk", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(monogram, width / 2, badgeY + badgeH / 2 + 4)

  // Product English or Persian display title
  const headline = (product.nameEn || product.name).trim()
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 54px "Space Grotesk", system-ui, sans-serif'
  ctx.fillText(headline.slice(0, 26), width / 2, height * 0.64)

  // Category / Official subscription subtitle (avoid repeating identical product title)
  const rawCategory = (product.categoryNameFa || '').trim()
  const subline =
    rawCategory && rawCategory.toLowerCase() !== headline.toLowerCase()
      ? rawCategory
      : 'اشتراک رسمی دیجیتال'
  ctx.fillStyle = '#94a3b8'
  ctx.font = '600 28px Vazirmatn, system-ui, sans-serif'
  ctx.fillText(subline, width / 2, height * 0.74)

  // Bottom crimson signature trim
  const barW = 240
  ctx.fillStyle = accentHex
  ctx.fillRect((width - barW) / 2, height - 74, barW, 4)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  texture.needsUpdate = true
  return texture
}

/**
 * Generates a soft radial ground contact shadow texture for the display pedestal.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 16, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)')
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.34)')
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export function ProductShowcaseCanvas({ product, reducedMotion }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [webglFailed, setWebglFailed] = useState(false)
  const [imageLoadState, setImageLoadState] = useState<'idle' | 'loaded' | 'fallback'>('idle')
  const [isInteracting, setIsInteracting] = useState(false)

  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion

  const sceneApiRef = useRef<{
    setProduct: (item: ShowcaseProductItem) => void
    setTargetHover: (nx: number, ny: number) => void
    addDragDelta: (dx: number, dy: number) => void
    releaseDrag: () => void
    resetView: () => void
  } | null>(null)

  const dragStateRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  })

  // Initialize Three.js studio showcase once on desktop mount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let rafId = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let isVisible = true

    const width = Math.max(320, container.clientWidth)
    const height = Math.max(260, container.clientHeight)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      setWebglFailed(true)
      return
    }

    const gl = renderer.getContext()
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const glRenderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ''
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(glRenderer)
    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 4)

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)

    const canvas = renderer.domElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    container.innerHTML = ''
    container.appendChild(canvas)

    const scene = new THREE.Scene()
    const envMap = createStudioEnvironmentMap(renderer)
    scene.environment = envMap

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 40)
    camera.position.set(0, 0.32, 4.95)
    camera.lookAt(0, -0.06, 0)

    // Balanced dark studio 3-point lighting + subtle crimson accent bounce
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x050811, 0.75)
    scene.add(hemi)

    const keyLight = new THREE.DirectionalLight(0xf1f5ff, 2.0)
    keyLight.position.set(2.8, 3.6, 4.2)
    scene.add(keyLight)

    const rimCool = new THREE.DirectionalLight(0x38bdf8, 1.15)
    rimCool.position.set(-3.4, 2.2, -2.5)
    scene.add(rimCool)

    const accentPoint = new THREE.PointLight(0xe10600, 2.4, 7.5, 1.8)
    accentPoint.position.set(0, -0.82, 1.45)
    scene.add(accentPoint)

    // Root showcase rig (pedestal stays grounded; floating display frame tilts & responds)
    const stageRoot = new THREE.Group()
    stageRoot.position.set(0, 0.12, 0)
    scene.add(stageRoot)

    // 1. Grounded Architectural Pedestal
    const pedestalGroup = new THREE.Group()
    pedestalGroup.position.set(0, -1.12, 0)
    stageRoot.add(pedestalGroup)

    const obsidianMetal = new THREE.MeshStandardMaterial({
      color: 0x0c111d,
      roughness: 0.34,
      metalness: 0.82,
      envMapIntensity: 1.15,
    })

    const darkTitanium = new THREE.MeshStandardMaterial({
      color: 0x1b2436,
      roughness: 0.26,
      metalness: 0.88,
      envMapIntensity: 1.25,
    })

    const accentEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xe10600,
      emissive: 0xe10600,
      emissiveIntensity: 1.55,
      roughness: 0.25,
      metalness: 0.2,
    })

    // Soft contact shadow plane
    const contactShadowTex = createContactShadowTexture()
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 3.5),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    )
    contactShadow.rotation.x = -Math.PI / 2
    contactShadow.position.y = -0.14
    pedestalGroup.add(contactShadow)

    // Lower wide plinth base
    const basePlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.38, 1.54, 0.14, 48),
      obsidianMetal,
    )
    basePlinth.position.y = -0.06
    pedestalGroup.add(basePlinth)

    // Recessed subtle accent collar ring
    const accentRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.016, 12, 64),
      accentEmissiveMat,
    )
    accentRing.rotation.x = Math.PI / 2
    accentRing.position.y = 0.025
    pedestalGroup.add(accentRing)

    // Upper machined platform cap
    const upperCap = new THREE.Mesh(
      new THREE.CylinderGeometry(1.16, 1.24, 0.07, 48),
      darkTitanium,
    )
    upperCap.position.y = 0.055
    pedestalGroup.add(upperCap)

    // Subtle vertical energy-free architectural riser pin
    const riserPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, 0.16, 24),
      obsidianMetal,
    )
    riserPin.position.y = 0.15
    pedestalGroup.add(riserPin)

    // 2. Floating 3D Glass Display Frame
    const frameGroup = new THREE.Group()
    frameGroup.position.set(0, 0.14, 0.05)
    stageRoot.add(frameGroup)

    const frameOuterW = DISPLAY_WIDTH + 0.18
    const frameOuterH = DISPLAY_HEIGHT + 0.18
    const frameDepth = 0.11

    // Brushed obsidian rear chassis
    const rearChassis = new THREE.Mesh(
      new THREE.BoxGeometry(frameOuterW - 0.04, frameOuterH - 0.04, frameDepth),
      obsidianMetal,
    )
    rearChassis.position.z = -0.03
    frameGroup.add(rearChassis)

    // Precision perimeter bezel rails (top, bottom, left, right)
    const railThickness = 0.065
    const railDepth = 0.145
    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(frameOuterW, railThickness, railDepth),
      darkTitanium,
    )
    topRail.position.set(0, frameOuterH / 2 - railThickness / 2, 0.005)

    const bottomRail = new THREE.Mesh(
      new THREE.BoxGeometry(frameOuterW, railThickness, railDepth),
      darkTitanium,
    )
    bottomRail.position.set(0, -(frameOuterH / 2 - railThickness / 2), 0.005)

    const leftRail = new THREE.Mesh(
      new THREE.BoxGeometry(railThickness, frameOuterH - railThickness * 2, railDepth),
      darkTitanium,
    )
    leftRail.position.set(-(frameOuterW / 2 - railThickness / 2), 0, 0.005)

    const rightRail = new THREE.Mesh(
      new THREE.BoxGeometry(railThickness, frameOuterH - railThickness * 2, railDepth),
      darkTitanium,
    )
    rightRail.position.set(frameOuterW / 2 - railThickness / 2, 0, 0.005)

    frameGroup.add(topRail, bottomRail, leftRail, rightRail)

    // Subtle crimson/accent bottom edge trim bar
    const bottomAccentBar = new THREE.Mesh(
      new THREE.BoxGeometry(DISPLAY_WIDTH * 0.56, 0.022, 0.028),
      accentEmissiveMat,
    )
    bottomAccentBar.position.set(0, -frameOuterH / 2 - 0.006, 0.055)
    frameGroup.add(bottomAccentBar)

    // 4 Corner precision micro-brackets
    const bracketGeo = new THREE.BoxGeometry(0.16, 0.03, 0.03)
    const cornerOffsets: [number, number][] = [
      [-frameOuterW / 2 + 0.08, frameOuterH / 2 + 0.008],
      [frameOuterW / 2 - 0.08, frameOuterH / 2 + 0.008],
      [-frameOuterW / 2 + 0.08, -frameOuterH / 2 - 0.008],
      [frameOuterW / 2 - 0.08, -frameOuterH / 2 - 0.008],
    ]
    for (const [cx, cy] of cornerOffsets) {
      const bracket = new THREE.Mesh(bracketGeo, darkTitanium)
      bracket.position.set(cx, cy, 0.068)
      frameGroup.add(bracket)
    }

    // Subtle backplate glass halo surround (gives depth without obscuring the image)
    const glassSurroundMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.14,
      metalness: 0.2,
      transparent: true,
      opacity: 0.14,
      envMapIntensity: 1.4,
    })
    const glassSurround = new THREE.Mesh(
      new THREE.BoxGeometry(frameOuterW + 0.12, frameOuterH + 0.12, 0.03),
      glassSurroundMat,
    )
    glassSurround.position.z = -0.05
    frameGroup.add(glassSurround)

    // 3. Real Product Image Display Plane (Front-lit, true sRGB color fidelity)
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.24,
      metalness: 0.04,
      emissive: 0xffffff,
      emissiveIntensity: 0.18,
      envMapIntensity: 0.32,
    })
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(DISPLAY_WIDTH, DISPLAY_HEIGHT),
      screenMaterial,
    )
    screenMesh.position.z = 0.062
    frameGroup.add(screenMesh)

    // Subtle reflective front bevel glaze on hardware WebGL (kept ultra-clean so image stays crisp)
    let frontGlaze: THREE.Mesh | null = null
    if (!isSoftwareGl) {
      const glazeMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.055,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        envMapIntensity: 0.9,
        depthWrite: false,
      })
      frontGlaze = new THREE.Mesh(
        new THREE.PlaneGeometry(DISPLAY_WIDTH, DISPLAY_HEIGHT),
        glazeMat,
      )
      frontGlaze.position.z = 0.072
      frameGroup.add(frontGlaze)
    }

    // Texture cache & active loading token to prevent race conditions when switching rapidly
    const textureLoader = new THREE.TextureLoader()
    textureLoader.setCrossOrigin('anonymous')
    const remoteTextureCache = new Map<string, THREE.Texture>()
    const fallbackTextureCache = new Map<string, THREE.CanvasTexture>()
    let loadSeq = 0

    // Interactive motion state
    let hoverYaw = 0
    let hoverPitch = 0
    let dragYaw = 0
    let dragPitch = 0
    let currentYaw = 0
    let currentPitch = 0
    let transitionScale = 1
    let currentProductId = ''

    const applyTextureToScreen = (tex: THREE.Texture) => {
      screenMaterial.map = tex
      screenMaterial.emissiveMap = tex
      screenMaterial.needsUpdate = true
    }

    const getOrCreateFallback = (item: ShowcaseProductItem, accentHex: string) => {
      const cacheKey = `${item.id}|${item.name}|${item.nameEn}|${accentHex}`
      const existing = fallbackTextureCache.get(cacheKey)
      if (existing) return existing
      const created = createFallbackProductTexture(item, accentHex, maxAnisotropy)
      fallbackTextureCache.set(cacheKey, created)
      return created
    }

    const setProduct = (item: ShowcaseProductItem) => {
      const accentHex = resolveShowcaseAccentHex(item.slug, item.categorySlug)
      const accentColor = new THREE.Color(accentHex)
      accentEmissiveMat.color.copy(accentColor)
      accentEmissiveMat.emissive.copy(accentColor)
      accentPoint.color.copy(accentColor)

      // Trigger smooth tactile settle animation on product change
      if (currentProductId && currentProductId !== item.id && !reducedMotionRef.current) {
        transitionScale = 0.91
        currentYaw += 0.24
      }
      currentProductId = item.id

      const seq = ++loadSeq
      const fallbackTex = getOrCreateFallback(item, accentHex)
      const rawUrl = item.imageUrl?.trim()

      if (!rawUrl) {
        applyTextureToScreen(fallbackTex)
        if (!disposed) setImageLoadState('fallback')
        return
      }

      const cached = remoteTextureCache.get(rawUrl)
      if (cached) {
        applyTextureToScreen(cached)
        if (!disposed) setImageLoadState('loaded')
        return
      }

      // Immediately show clean fallback plate while the real image loads (zero flash/blank frame)
      applyTextureToScreen(fallbackTex)

      textureLoader.load(
        rawUrl,
        (loadedTex) => {
          if (disposed) {
            loadedTex.dispose()
            return
          }
          loadedTex.colorSpace = THREE.SRGBColorSpace
          loadedTex.anisotropy = maxAnisotropy
          loadedTex.wrapS = THREE.ClampToEdgeWrapping
          loadedTex.wrapT = THREE.ClampToEdgeWrapping
          const img = loadedTex.image as { width?: number; height?: number } | undefined
          const uv = computeCoverUvTransform(
            img?.width ?? 1600,
            img?.height ?? 1000,
            DISPLAY_ASPECT,
          )
          loadedTex.repeat.set(uv.repeatX, uv.repeatY)
          loadedTex.offset.set(uv.offsetX, uv.offsetY)
          loadedTex.needsUpdate = true

          remoteTextureCache.set(rawUrl, loadedTex)
          if (seq === loadSeq) {
            applyTextureToScreen(loadedTex)
            setImageLoadState('loaded')
          }
        },
        undefined,
        () => {
          // Graceful fallback if remote image fails CORS/network
          if (!disposed && seq === loadSeq) {
            applyTextureToScreen(fallbackTex)
            setImageLoadState('fallback')
          }
        },
      )
    }

    sceneApiRef.current = {
      setProduct,
      setTargetHover(nx: number, ny: number) {
        hoverYaw = nx * 0.24
        hoverPitch = -ny * 0.09
      },
      addDragDelta(dx: number, dy: number) {
        const clamped = clampShowcaseRotation(
          dragYaw + dx * 0.0055,
          dragPitch + dy * 0.0035,
          reducedMotionRef.current,
        )
        dragYaw = clamped.yaw
        dragPitch = clamped.pitch
      },
      releaseDrag() {
        // Gentle settle back toward center happens smoothly in render loop
      },
      resetView() {
        hoverYaw = 0
        hoverPitch = 0
        dragYaw = 0
        dragPitch = 0
      },
    }

    // Apply initial product immediately
    setProduct(product)

    // ResizeObserver for crisp container-locked sizing
    const resizeObserver = new ResizeObserver((entries) => {
      if (disposed) return
      const entry = entries[0]
      if (!entry) return
      const w = Math.max(240, Math.round(entry.contentRect.width))
      const h = Math.max(220, Math.round(entry.contentRect.height))
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(w, h)
    })
    resizeObserver.observe(container)

    // Pause rendering cleanly when scrolled far out of view
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true
      },
      { rootMargin: '220px 0px' },
    )
    intersectionObserver.observe(container)

    const clock = new THREE.Clock()
    let elapsed = 0

    const scheduleNext = () => {
      if (disposed) return
      if (isSoftwareGl) {
        timeoutId = setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(tick)
        }, 70)
      } else {
        rafId = requestAnimationFrame(tick)
      }
    }

    const tick = () => {
      if (disposed) return
      const delta = Math.min(clock.getDelta(), 0.05)

      if (!isVisible || document.hidden) {
        scheduleNext()
        return
      }

      const reduced = reducedMotionRef.current
      elapsed += delta

      // Smoothly relax drag offset back toward neutral when not dragging
      if (!dragStateRef.current.active) {
        dragYaw = THREE.MathUtils.damp(dragYaw, 0, 2.4, delta)
        dragPitch = THREE.MathUtils.damp(dragPitch, 0, 2.4, delta)
      }

      const idleYaw = reduced ? 0 : Math.sin(elapsed * 0.65) * 0.055
      const idleFloat = reduced ? 0 : Math.sin(elapsed * 1.15) * 0.032

      const target = clampShowcaseRotation(
        hoverYaw + dragYaw + idleYaw,
        hoverPitch + dragPitch,
        reduced,
      )

      currentYaw = THREE.MathUtils.damp(currentYaw, target.yaw, 7.5, delta)
      currentPitch = THREE.MathUtils.damp(currentPitch, target.pitch, 7.5, delta)
      transitionScale = THREE.MathUtils.damp(transitionScale, 1, 9.5, delta)

      frameGroup.rotation.y = currentYaw
      frameGroup.rotation.x = currentPitch
      frameGroup.position.y = 0.14 + idleFloat
      frameGroup.scale.setScalar(transitionScale)

      // Subtle breathing on pedestal rim light
      accentPoint.intensity = reduced ? 2.2 : 2.15 + Math.sin(elapsed * 1.5) * 0.25

      renderer.render(scene, camera)
      scheduleNext()
    }

    // Immediate first frame draw so the showcase is visible right away
    renderer.render(scene, camera)
    rafId = requestAnimationFrame(tick)

    return () => {
      disposed = true
      sceneApiRef.current = null
      cancelAnimationFrame(rafId)
      if (timeoutId !== null) clearTimeout(timeoutId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()

      remoteTextureCache.forEach((t) => t.dispose())
      remoteTextureCache.clear()
      fallbackTextureCache.forEach((t) => t.dispose())
      fallbackTextureCache.clear()
      contactShadowTex.dispose()
      envMap.dispose()

      stageRoot.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose())
          } else {
            mesh.material.dispose()
          }
        }
      })
      if (frontGlaze) {
        frontGlaze.geometry.dispose()
        ;(frontGlaze.material as THREE.Material).dispose()
      }

      renderer.dispose()
      container.innerHTML = ''
    }
    // Intentionally initialize renderer once; product updates flow through sceneApiRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push product changes smoothly into the live 3D showcase without rebuilding WebGL
  useEffect(() => {
    sceneApiRef.current?.setProduct(product)
  }, [
    product.id,
    product.slug,
    product.name,
    product.nameEn,
    product.categorySlug,
    product.categoryNameFa,
    product.imageUrl,
    product.priceLabel,
    product,
  ])

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    if (dragStateRef.current.active) {
      const dx = e.clientX - dragStateRef.current.lastX
      const dy = e.clientY - dragStateRef.current.lastY
      dragStateRef.current.lastX = e.clientX
      dragStateRef.current.lastY = e.clientY
      sceneApiRef.current?.addDragDelta(dx, dy)
      return
    }

    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
    sceneApiRef.current?.setTargetHover(nx, ny)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return
    dragStateRef.current = { active: true, lastX: e.clientX, lastY: e.clientY }
    setIsInteracting(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerUp = () => {
    dragStateRef.current.active = false
    setIsInteracting(false)
    sceneApiRef.current?.releaseDrag()
  }

  const handlePointerLeave = () => {
    dragStateRef.current.active = false
    setIsInteracting(false)
    sceneApiRef.current?.setTargetHover(0, 0)
  }

  // Automatic graceful 2D fallback if WebGL is unavailable in the user's browser
  if (webglFailed) {
    return (
      <div className="relative flex h-full min-h-[320px] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#080c16] p-6">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-h-[300px] w-full rounded-xl object-cover shadow-2xl"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#e10600]/45 bg-[#101626] text-2xl font-black text-white">
              {resolveProductMonogram(product.nameEn, product.name)}
            </div>
            <p className="mt-4 text-lg font-bold text-white">{product.name}</p>
            <p className="mt-1 text-xs text-[#9cb2d6]">
              {product.categoryNameFa || 'اشتراک رسمی دیجیتال'}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      data-testid="product-3d-showcase"
      data-product-slug={product.slug}
      data-image-state={imageLoadState}
      className={`relative h-full min-h-[340px] w-full select-none overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_38%,rgba(24,38,72,0.48),rgba(6,9,18,0.92)_72%)] lg:min-h-[410px] ${
        isInteracting ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label={`نمای سه‌بعدی محصول ${product.name}`}
      />

      {/* Minimal non-intrusive bottom interaction hint + reset button */}
      <div className="pointer-events-none absolute inset-x-4 bottom-3 flex items-center justify-between text-[11px] text-[#8da3c8]">
        <span>برای زاویه دید بهتر، نشانگر را حرکت دهید یا بکشید</span>
        <button
          type="button"
          onClick={() => sceneApiRef.current?.resetView()}
          aria-label="بازنشانی زاویه نمای سه‌بعدی"
          className="pointer-events-auto inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#090e1c]/90 px-2 py-1 text-[11px] text-[#b9c8e3] transition hover:border-white/25 hover:text-white"
        >
          <RotateCcw className="h-3 w-3" />
          <span>زاویه پیش‌فرض</span>
        </button>
      </div>
    </div>
  )
}
