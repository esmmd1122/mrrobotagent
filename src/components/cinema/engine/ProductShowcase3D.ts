import * as THREE from 'three'
import { createPhoneOledTexture } from './textures'

export type ArtifactKey =
  | 'aiCore'
  | 'vpnShield'
  | 'applePhone'
  | 'obsidianCard'
  | 'neuralVault'

export function resolveArtifactKey(
  slug: string,
  categorySlug?: string | null,
  nameEn?: string | null,
): ArtifactKey {
  const hay = `${slug} ${categorySlug ?? ''} ${nameEn ?? ''}`.toLowerCase()
  if (/vpn|v2ray|wireguard|proxy|network|dns/.test(hay)) return 'vpnShield'
  if (/apple|icloud|iphone|ios|mobile|repair/.test(hay)) return 'applePhone'
  if (/cursor|copilot|github|code|dev|claude|ide|api/.test(hay)) return 'neuralVault'
  if (/chatgpt|openai|gemini|midjourney|perplexity|ai|gpt/.test(hay)) return 'aiCore'
  return 'obsidianCard'
}

export class ProductShowcase3D {
  readonly root = new THREE.Group()
  private readonly pivot = new THREE.Group()
  private readonly items: Record<ArtifactKey, THREE.Group>
  private baseRing!: THREE.Mesh
  private phoneTex!: THREE.CanvasTexture

  rotY = 0
  dragVel = 0
  scaleNow = 0.001
  scaleTarget = 0.001

  constructor(options?: { isSoftwareGl?: boolean }) {
    this.root.add(this.pivot)
    this.items = this.buildArtifacts(Boolean(options?.isSoftwareGl))
    this.buildStageBase()
    this.setArtifact('aiCore')
  }

  private buildStageBase() {
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.88, 0.009, 10, 72),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 1.8,
        toneMapped: false,
      }),
    )
    ring1.rotation.x = Math.PI / 2
    ring1.position.y = -0.92
    this.root.add(ring1)
    this.baseRing = ring1
  }

  private buildArtifacts(isSoftwareGl: boolean): Record<ArtifactKey, THREE.Group> {
    const metal = new THREE.MeshPhysicalMaterial({
      color: 0x1e2c48,
      roughness: 0.22,
      metalness: 0.92,
      clearcoat: 0.5,
    })
    const glass = isSoftwareGl
      ? new THREE.MeshPhysicalMaterial({
          color: 0x60a5fa,
          roughness: 0.14,
          metalness: 0.2,
          transparent: true,
          opacity: 0.58,
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0x60a5fa,
          roughness: 0.08,
          metalness: 0.1,
          transmission: 0.72,
          thickness: 0.6,
          ior: 1.48,
        })
    const redGlow = new THREE.MeshStandardMaterial({
      color: 0xff2a4e,
      emissive: 0xef1d42,
      emissiveIntensity: 2.8,
      toneMapped: false,
    })
    const cyanGlow = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 2.0,
      toneMapped: false,
    })

    // 1. AI Neural Prism Core
    const aiCore = new THREE.Group()
    const aiRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.013, 12, 64), redGlow)
    aiRing1.rotation.x = 0.9
    const aiRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.009, 12, 64), cyanGlow)
    aiRing2.rotation.y = 1.1
    aiCore.add(
      new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 1), glass),
      new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), metal),
      aiRing1,
      aiRing2,
    )

    // 2. V2Ray Encrypted Shield Prism
    const vpnShield = new THREE.Group()
    const shieldRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.011, 10, 6), redGlow)
    shieldRing2.rotation.y = Math.PI / 2
    vpnShield.add(
      new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 0), metal),
      new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.018, 10, 6), cyanGlow),
      shieldRing2,
    )

    // 3. Precision Titanium Smartphone Monolith
    const applePhone = new THREE.Group()
    this.phoneTex = createPhoneOledTexture()
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.44, 0.085), metal)
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 1.34),
      new THREE.MeshBasicMaterial({ map: this.phoneTex }),
    )
    screen.position.z = 0.045
    const camBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.26, 0.035),
      new THREE.MeshStandardMaterial({ color: 0x0c1324, roughness: 0.25, metalness: 0.85 }),
    )
    camBlock.position.set(0.16, 0.48, -0.052)
    applePhone.add(chassis, screen, camBlock)

    // 4. Obsidian Metal Digital Keycard
    const obsidianCard = new THREE.Group()
    const cardBody = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.84, 0.042), metal)
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.052), redGlow)
    chip.position.set(-0.38, 0.1, 0)
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.042, 0.048), cyanGlow)
    bar.position.y = -0.24
    obsidianCard.add(cardBody, chip, bar)

    // 5. Neural Dev Vault Sculpture
    const neuralVault = new THREE.Group()
    neuralVault.add(
      new THREE.Mesh(new THREE.TorusKnotGeometry(0.42, 0.11, 100, 18), metal),
      new THREE.Mesh(
        new THREE.SphereGeometry(0.76, 20, 16),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.2,
        }),
      ),
    )

    const map: Record<ArtifactKey, THREE.Group> = {
      aiCore,
      vpnShield,
      applePhone,
      obsidianCard,
      neuralVault,
    }

    Object.values(map).forEach((grp) => {
      grp.visible = false
      this.pivot.add(grp)
    })

    return map
  }

  setArtifact(key: ArtifactKey) {
    if (!this.items[key]) return
    ;(Object.entries(this.items) as [ArtifactKey, THREE.Group][]).forEach(([k, grp]) => {
      grp.visible = k === key
    })
    this.pivot.scale.setScalar(0.68)
    this.dragVel = 0.065
  }

  update(elapsed: number, delta: number, reducedMotion: boolean) {
    const m = reducedMotion ? 0.22 : 1.0
    this.scaleNow = THREE.MathUtils.lerp(this.scaleNow, this.scaleTarget, 0.08)
    this.root.scale.setScalar(Math.max(0.001, this.scaleNow))
    this.root.visible = this.scaleNow > 0.015

    const pScale = THREE.MathUtils.lerp(this.pivot.scale.x, 1.0, 0.1)
    this.pivot.scale.setScalar(pScale)

    this.dragVel *= 0.93
    this.rotY += this.dragVel + delta * 0.4 * m
    this.pivot.rotation.y = this.rotY
    this.pivot.rotation.x = Math.sin(elapsed * 0.95) * 0.12 * m
    this.pivot.position.y = Math.sin(elapsed * 1.8) * 0.06 * m
    this.baseRing.rotation.z += delta * 0.35 * m
  }

  dispose() {
    const geos = new Set<THREE.BufferGeometry>()
    const mats = new Set<THREE.Material>()
    this.root.traverse((child) => {
      const m = child as THREE.Mesh
      if (!m.isMesh) return
      geos.add(m.geometry)
      if (Array.isArray(m.material)) m.material.forEach((mm) => mats.add(mm))
      else if (m.material) mats.add(m.material)
    })
    geos.forEach((g) => g.dispose())
    mats.forEach((m) => m.dispose())
    this.phoneTex?.dispose()
  }
}
