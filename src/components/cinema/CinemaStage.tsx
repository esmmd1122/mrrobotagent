'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createStudioEnvironmentMap } from './engine/textures'
import { ProceduralMrRobotRig } from './engine/character/ProceduralMrRobotRig'
import type { AssistantAnimState } from './engine/character/assistant-state'
import type { CharacterAssetMetadata } from './engine/character/types'
import { buildCinemaEnvironment } from './engine/environment'
import { ProductShowcase3D, type ArtifactKey } from './engine/ProductShowcase3D'
import { STORY_KEYFRAMES, evaluateStoryFrame } from './engine/keyframes'

export const SCENE_IDS = [
  'hero',
  'intro',
  'ai-builder',
  'marketplace',
  'ai-experience',
  'apple-mobile',
  'trust',
  'finale',
] as const

export type CinemaStageHandle = {
  setArtifact: (key: ArtifactKey) => void
  applyProductDrag: (deltaX: number) => void
  pulseCharacterEyes: (intensity?: number) => void
  setAssistantState: (state: AssistantAnimState, chatOpen?: boolean) => void
  triggerCharacterAttention: (durationSec?: number) => void
  loadOfficialGlb: (urlOrBlobUrl: string, label?: string) => Promise<CharacterAssetMetadata>
  playAnimationClip: (clipName: string) => boolean
  resetCharacter: () => CharacterAssetMetadata | null
}

type Props = {
  reducedMotion: boolean
  initialArtifact?: ArtifactKey
  chatOpen?: boolean
  assistantState?: AssistantAnimState
  onActiveSceneChange?: (sceneIndex: number, sceneId: string) => void
  onReady?: () => void
  onCharacterMetaChange?: (meta: CharacterAssetMetadata) => void
  onCharacterClick?: () => void
}

let webglMountCounter = 0

function isInteractiveDomTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'a, button, input, textarea, select, label, [role="button"], [role="dialog"], [data-ai-chat-panel], [data-ai-chat-trigger], .cinema-order-drawer, .cinema-mobile-drawer, .cinema-modal-box, .cinema-navbar, .cinema-chapter-rail',
    ),
  )
}

export const CinemaStage = forwardRef<CinemaStageHandle, Props>(function CinemaStage(
  {
    reducedMotion,
    initialArtifact = 'aiCore',
    chatOpen = false,
    assistantState = 'idle',
    onActiveSceneChange,
    onReady,
    onCharacterMetaChange,
    onCharacterClick,
  },
  ref,
) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [webglUnavailable, setWebglUnavailable] = useState(false)
  const [mountInstanceId, setMountInstanceId] = useState(0)

  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion

  const chatOpenRef = useRef(chatOpen)
  chatOpenRef.current = chatOpen

  const assistantStateRef = useRef<AssistantAnimState>(assistantState)
  assistantStateRef.current = assistantState

  const onActiveSceneChangeRef = useRef(onActiveSceneChange)
  onActiveSceneChangeRef.current = onActiveSceneChange

  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  const onCharacterMetaChangeRef = useRef(onCharacterMetaChange)
  onCharacterMetaChangeRef.current = onCharacterMetaChange

  const onCharacterClickRef = useRef(onCharacterClick)
  onCharacterClickRef.current = onCharacterClick

  const initialArtifactRef = useRef(initialArtifact)
  const characterRef = useRef<ProceduralMrRobotRig | null>(null)
  const productStageRef = useRef<ProductShowcase3D | null>(null)

  // Synchronize assistant animation state without ever reinitializing WebGL
  useEffect(() => {
    characterRef.current?.setAssistantState(assistantState, chatOpen)
  }, [assistantState, chatOpen])

  useImperativeHandle(
    ref,
    () => ({
      setArtifact(key) {
        productStageRef.current?.setArtifact(key)
      },
      applyProductDrag(deltaX) {
        if (productStageRef.current) {
          productStageRef.current.dragVel = deltaX * 0.015
        }
      },
      pulseCharacterEyes(intensity = 5.4) {
        characterRef.current?.setEyePulseBoost(intensity)
      },
      setAssistantState(state, nextChatOpen) {
        characterRef.current?.setAssistantState(state, nextChatOpen)
      },
      triggerCharacterAttention(durationSec = 1.25) {
        characterRef.current?.triggerAttention(durationSec)
      },
      async loadOfficialGlb(urlOrBlobUrl, label) {
        if (!characterRef.current) {
          throw new Error('صحنه سه‌بعدی هنوز آماده نیست')
        }
        const meta = await characterRef.current.loadOfficialModel(urlOrBlobUrl, label)
        onCharacterMetaChangeRef.current?.(meta)
        return meta
      },
      playAnimationClip(clipName) {
        if (!characterRef.current) return false
        const ok = characterRef.current.playAnimationClip(clipName)
        if (ok) {
          onCharacterMetaChangeRef.current?.(characterRef.current.getAssetMetadata())
        }
        return ok
      },
      resetCharacter() {
        if (!characterRef.current) return null
        const meta = characterRef.current.resetToReferenceRig()
        onCharacterMetaChangeRef.current?.(meta)
        return meta
      },
    }),
    [],
  )

  useEffect(() => {
    const host = mountRef.current
    if (!host) return

    let disposed = false
    let rafId = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const instanceId = ++webglMountCounter
    setMountInstanceId(instanceId)

    const canvas = document.createElement('canvas')
    canvas.className = 'cinema-webgl-canvas'
    canvas.dataset.webglInstance = String(instanceId)
    host.innerHTML = ''
    host.appendChild(canvas)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
    } catch {
      setWebglUnavailable(true)
      onReadyRef.current?.()
      return
    }

    const gl = renderer.getContext()
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const glRenderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ''
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(glRenderer)
    const isMobile = window.innerWidth < 768

    const resolveDpr = () => {
      if (isSoftwareGl) return 1
      const maxDpr = window.innerWidth < 768 ? 1.5 : 1.75
      return Math.min(window.devicePixelRatio || 1, maxDpr)
    }

    renderer.setPixelRatio(resolveDpr())
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x030712)
    scene.fog = new THREE.FogExp2(0x030712, 0.044)
    const envMap = createStudioEnvironmentMap(renderer)
    scene.environment = envMap

    const camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    )
    camera.position.set(0.15, 1.3, 5.95)

    // Selective Studio Bloom on GPUs; direct single-pass render on software WebGL
    let composer: EffectComposer | null = null
    let bloomPass: UnrealBloomPass | null = null
    if (!isSoftwareGl) {
      try {
        composer = new EffectComposer(renderer)
        composer.addPass(new RenderPass(scene, camera))
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.46,
          0.58,
          0.9,
        )
        composer.addPass(bloomPass)
        composer.addPass(new OutputPass())
      } catch {
        composer = null
      }
    }

    // Cinema Studio Lighting Rig tuned for dark obsidian hoodie + cinematic crimson rim highlights
    const hemiLight = new THREE.HemisphereLight(0x4b5f84, 0x07040a, 0.72)
    scene.add(hemiLight)

    const keyLight = new THREE.DirectionalLight(0xe6eefc, 1.95)
    keyLight.position.set(2.8, 5.0, 5.2)
    scene.add(keyLight)

    const rimCyan = new THREE.SpotLight(0x38bdf8, 4.2, 22, Math.PI / 3.2, 0.7, 1.4)
    rimCyan.position.set(-4.6, 4.4, -3.6)
    scene.add(rimCyan)

    const rimViolet = new THREE.PointLight(0xef1d42, 4.8, 16, 1.5)
    rimViolet.position.set(4.2, 2.2, -2.4)
    scene.add(rimViolet)

    // Primary crimson back-left & right rim lights accentuating hood, headphones, backpack & crossed sleeves
    const crimsonRim = new THREE.SpotLight(0xff1638, 13.5, 19, Math.PI / 2.6, 0.72, 1.3)
    crimsonRim.position.set(-3.4, 2.6, -2.2)
    scene.add(crimsonRim)

    const crimsonFill = new THREE.PointLight(0xff1a3c, 3.6, 13, 1.6)
    crimsonFill.position.set(-2.4, 0.4, 2.9)
    scene.add(crimsonFill)

    const envRig = buildCinemaEnvironment(scene, { isMobile, isSoftwareGl })
    const mrRobot = new ProceduralMrRobotRig({ isSoftwareGl })
    mrRobot.setAssistantState(assistantStateRef.current, chatOpenRef.current)
    scene.add(mrRobot.root)
    characterRef.current = mrRobot
    onCharacterMetaChangeRef.current?.(mrRobot.getAssetMetadata())

    const productStage = new ProductShowcase3D({ isSoftwareGl })
    productStage.setArtifact(initialArtifactRef.current)
    scene.add(productStage.root)
    productStageRef.current = productStage

    // Optional future official GLB URL hook via environment variable
    const officialModelUrl = process.env.NEXT_PUBLIC_MR_ROBOT_MODEL_URL?.trim()
    if (officialModelUrl) {
      mrRobot
        .loadOfficialModel(officialModelUrl, 'مدل رسمی MR.ROBOT')
        .then((meta) => {
          if (!disposed) onCharacterMetaChangeRef.current?.(meta)
        })
        .catch(() => {
          // Gracefully remain on official procedural 3D rig if model URL is unavailable
        })
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera)
    }

    // Section-anchored continuous scroll progress
    let rawScrollProgress = 0
    let smoothScrollProgress = 0
    let sectionElements: HTMLElement[] = []

    const refreshSections = () => {
      sectionElements = Array.from(
        document.querySelectorAll<HTMLElement>('section.cinema-story-scene'),
      )
    }

    const updateScrollProgress = () => {
      if (sectionElements.length < STORY_KEYFRAMES.length) {
        refreshSections()
      }
      if (sectionElements.length >= 2) {
        const y = window.scrollY
        const anchors = sectionElements.map((el, idx) => {
          if (idx === 0) return 0
          return Math.max(0, el.offsetTop - window.innerHeight * 0.08)
        })
        if (y <= anchors[0]) {
          rawScrollProgress = 0
          return
        }
        const lastIdx = anchors.length - 1
        if (y >= anchors[lastIdx]) {
          rawScrollProgress = Math.min(lastIdx, STORY_KEYFRAMES.length - 1)
          return
        }
        for (let i = 0; i < lastIdx; i++) {
          if (y >= anchors[i] && y <= anchors[i + 1]) {
            const span = Math.max(1, anchors[i + 1] - anchors[i])
            rawScrollProgress = i + (y - anchors[i]) / span
            return
          }
        }
      }
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      )
      rawScrollProgress =
        THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1) *
        (STORY_KEYFRAMES.length - 1)
    }
    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    refreshSections()
    updateScrollProgress()
    smoothScrollProgress = rawScrollProgress

    gsap.registerPlugin(ScrollTrigger)
    const gsapCtx = gsap.context(() => {
      const scenes = document.querySelectorAll<HTMLElement>('section.cinema-story-scene')
      scenes.forEach((sec, idx) => {
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 52%',
          end: 'bottom 48%',
          onEnter: () => onActiveSceneChangeRef.current?.(idx, SCENE_IDS[idx] ?? 'hero'),
          onEnterBack: () => onActiveSceneChangeRef.current?.(idx, SCENE_IDS[idx] ?? 'hero'),
        })

        const revealItems = sec.querySelectorAll(
          '.cinema-navy-card, .cinema-pillar-box, .cinema-neural-console',
        )
        if (revealItems.length && !reducedMotionRef.current) {
          gsap.from(revealItems, {
            y: 26,
            opacity: 0,
            duration: 0.72,
            stagger: 0.07,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            scrollTrigger: { trigger: sec, start: 'top 80%', once: true },
          })
        }
      })
    })

    // Fast raycasting strictly against the mascot hitProxy for click/tap & hover acknowledgment
    const raycaster = new THREE.Raycaster()
    const rayNdc = new THREE.Vector2()
    const hitTargets: THREE.Object3D[] = [mrRobot.hitProxy]
    let lastHoverCheckMs = 0
    let wasHoveringMascot = false
    let downX = 0
    let downY = 0
    let downEligible = false

    const testMascotHit = (clientX: number, clientY: number): boolean => {
      const w = Math.max(1, window.innerWidth)
      const h = Math.max(1, window.innerHeight)
      rayNdc.set((clientX / w) * 2 - 1, -((clientY / h) * 2 - 1))
      raycaster.setFromCamera(rayNdc, camera)
      return raycaster.intersectObjects(hitTargets, false).length > 0
    }

    const mouse = { x: 0, y: 0 }
    const onPointerMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1
      mouse.y = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1)

      if (e.pointerType === 'touch') return
      const now = performance.now()
      if (now - lastHoverCheckMs < 55) return
      lastHoverCheckMs = now

      if (isInteractiveDomTarget(e.target)) {
        if (wasHoveringMascot) {
          wasHoveringMascot = false
          document.body.classList.remove('mr-mascot-hover')
        }
        return
      }

      const isHit = testMascotHit(e.clientX, e.clientY)
      if (isHit !== wasHoveringMascot) {
        wasHoveringMascot = isHit
        document.body.classList.toggle('mr-mascot-hover', isHit)
        if (isHit && !chatOpenRef.current) {
          mrRobot.triggerAttention(0.8)
        }
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      if (isInteractiveDomTarget(e.target)) {
        downEligible = false
        return
      }
      downEligible = true
      downX = e.clientX
      downY = e.clientY
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!downEligible) return
      downEligible = false
      const dx = e.clientX - downX
      const dy = e.clientY - downY
      if (dx * dx + dy * dy > 81) return // Ignore drags/scrolls > 9px
      if (isInteractiveDomTarget(e.target)) return

      if (testMascotHit(e.clientX, e.clientY)) {
        mrRobot.triggerAttention(1.35)
        onCharacterClickRef.current?.()
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })

    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / Math.max(1, h)
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(resolveDpr())
      renderer.setSize(w, h)
      if (composer) composer.setSize(w, h)
      if (bloomPass) bloomPass.resolution.set(w, h)
      updateScrollProgress()
    }
    window.addEventListener('resize', onResize)

    let contextLost = false
    const onContextLost = (e: Event) => {
      e.preventDefault()
      contextLost = true
    }
    const onContextRestored = () => {
      contextLost = false
    }
    canvas.addEventListener('webglcontextlost', onContextLost, false)
    canvas.addEventListener('webglcontextrestored', onContextRestored, false)

    // Pre-allocated scratch vectors & colors for zero-GC render loop
    const startTimeMs = performance.now()
    let lastTimeMs = startTimeMs
    const tmpFogA = new THREE.Color()
    const tmpFogB = new THREE.Color()
    const tmpRimCA = new THREE.Color()
    const tmpRimCB = new THREE.Color()
    const tmpRimVA = new THREE.Color()
    const tmpRimVB = new THREE.Color()
    const currentLook = new THREE.Vector3(-0.28, 1.02, 0)
    const targetLook = new THREE.Vector3()
    const fog = scene.fog as THREE.FogExp2
    const bgColor = scene.background as THREE.Color

    let smoothChatBlend = 0

    // Paced software-WebGL scheduling so headless browsers never starve CPU
    const afterDraw = (next: () => void) => {
      if (disposed) return
      const gl2 = gl as WebGL2RenderingContext
      if (typeof gl2.fenceSync === 'function') {
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0)
        gl2.flush()
        const poll = () => {
          if (disposed) {
            if (sync) gl2.deleteSync(sync)
            return
          }
          if (!sync || gl2.clientWaitSync(sync, 0, 0) !== gl2.TIMEOUT_EXPIRED) {
            if (sync) gl2.deleteSync(sync)
            timeoutId = setTimeout(next, 32)
          } else {
            timeoutId = setTimeout(poll, 16)
          }
        }
        timeoutId = setTimeout(poll, 16)
      } else {
        timeoutId = setTimeout(next, 50)
      }
    }

    let firstFrameNotified = false

    const renderFrame = () => {
      if (disposed) return
      if (!contextLost) {
        const nowMs = performance.now()
        const delta = Math.min(Math.max(0.001, (nowMs - lastTimeMs) / 1000), 0.05)
        lastTimeMs = nowMs
        const elapsed = (nowMs - startTimeMs) / 1000
        const reduced = reducedMotionRef.current
        const m = reduced ? 0.25 : 1.0

        const scrollLerp = isSoftwareGl ? 0.28 : reduced ? 0.2 : 0.075
        smoothScrollProgress = THREE.MathUtils.lerp(
          smoothScrollProgress,
          rawScrollProgress,
          scrollLerp,
        )

        const viewportW = window.innerWidth
        const frame = evaluateStoryFrame(smoothScrollProgress, viewportW)

        // Smoothly frame the 3D mascot beside the floating AI chat panel on desktop without reloading WebGL
        const desktopChatActive = chatOpenRef.current && viewportW >= 1024 ? 1 : 0
        smoothChatBlend = THREE.MathUtils.damp(smoothChatBlend, desktopChatActive, 4.5, delta)

        const chatCharX = THREE.MathUtils.lerp(frame.charPos[0], -1.35, smoothChatBlend)
        const chatCharY = THREE.MathUtils.lerp(frame.charPos[1], -0.06, smoothChatBlend)
        const chatCharZ = THREE.MathUtils.lerp(frame.charPos[2], 0.45, smoothChatBlend)
        const chatRotY = THREE.MathUtils.lerp(frame.charRotY, 0.42, smoothChatBlend)

        const camX = THREE.MathUtils.lerp(frame.cam[0], -0.1, smoothChatBlend)
        const camY = THREE.MathUtils.lerp(frame.cam[1], 1.32, smoothChatBlend)
        const camZ = THREE.MathUtils.lerp(frame.cam[2], 5.45, smoothChatBlend)

        camera.position.set(
          camX + mouse.x * 0.24 * m,
          camY + mouse.y * 0.13 * m,
          camZ,
        )

        if (Math.abs(camera.fov - frame.fov) > 0.05) {
          camera.fov = frame.fov
          camera.updateProjectionMatrix()
        }

        targetLook.set(
          THREE.MathUtils.lerp(frame.look[0], -0.45, smoothChatBlend),
          THREE.MathUtils.lerp(frame.look[1], 1.08, smoothChatBlend),
          frame.look[2],
        )
        currentLook.lerp(targetLook, 0.14)
        camera.lookAt(currentLook)

        mrRobot.root.position.set(chatCharX, chatCharY, chatCharZ)
        mrRobot.root.rotation.y = chatRotY
        mrRobot.pose = frame.pose
        mrRobot.update(elapsed, delta, mouse, reduced, productStage.dragVel)

        productStage.scaleTarget = frame.stageScale * (1 - smoothChatBlend * 0.6)
        productStage.root.position.set(frame.stagePos[0], frame.stagePos[1], frame.stagePos[2])
        productStage.update(elapsed, delta, reduced)

        tmpFogA.setHex(frame.fogA)
        tmpFogB.setHex(frame.fogB)
        fog.color.copy(tmpFogA).lerp(tmpFogB, frame.blend)
        bgColor.copy(fog.color)

        tmpRimCA.setHex(frame.rimCA)
        tmpRimCB.setHex(frame.rimCB)
        rimCyan.color.copy(tmpRimCA).lerp(tmpRimCB, frame.blend)

        tmpRimVA.setHex(frame.rimVA)
        tmpRimVB.setHex(frame.rimVB)
        rimViolet.color.copy(tmpRimVA).lerp(tmpRimVB, frame.blend)

        crimsonRim.intensity = THREE.MathUtils.damp(
          crimsonRim.intensity,
          chatOpenRef.current ? 12.2 : 9.5,
          4,
          delta,
        )

        envRig.horizonHalo.rotation.z += delta * 0.04 * m
        envRig.fgGroup.position.x = -mouse.x * 0.42 * m
        envRig.fgGroup.position.y = Math.sin(smoothScrollProgress * 0.9) * 0.35
        envRig.dust.rotation.y += delta * 0.014 * m

        if (composer && !isSoftwareGl) {
          composer.render()
        } else {
          renderer.render(scene, camera)
        }

        if (!firstFrameNotified) {
          firstFrameNotified = true
          onReadyRef.current?.()
        }
      }

      if (isSoftwareGl) {
        afterDraw(renderFrame)
      } else {
        rafId = requestAnimationFrame(renderFrame)
      }
    }

    renderFrame()

    return () => {
      disposed = true
      document.body.classList.remove('mr-mascot-hover')
      if (rafId) cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('scroll', updateScrollProgress)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      gsapCtx.revert()
      characterRef.current = null
      productStageRef.current = null
      mrRobot.dispose()
      productStage.dispose()
      envRig.dispose()
      envMap.dispose()
      composer?.dispose()
      renderer.dispose()
      host.innerHTML = ''
    }
  }, [])

  return (
    <>
      <div
        className="cinema-webgl-stage"
        aria-hidden="true"
        data-testid="mr-robot-stage"
        data-webgl-mount-id={mountInstanceId}
        data-assistant-state={assistantState}
        data-render-mode={webglUnavailable ? 'static-fallback' : 'webgl-3d'}
      >
        {webglUnavailable ? (
          <div className="relative flex h-full w-full items-start justify-center overflow-hidden bg-gradient-to-b from-[#09060e] via-[#04060f] to-[#02040a] pt-16 lg:items-center lg:justify-start lg:pl-20 lg:pt-0">
            <img
              src="/assets/aistudio/IMG_0544_1313509c.JPG"
              alt="کاراکتر رسمی MR.ROBOT"
              className="h-[300px] w-[300px] rounded-full object-cover object-top opacity-85 shadow-[0_0_90px_rgba(239,29,66,0.35)] lg:h-[440px] lg:w-[440px]"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div ref={mountRef} className="h-full w-full" />
        )}
      </div>
      <div className="cinema-film-grade" aria-hidden="true" />
    </>
  )
})
