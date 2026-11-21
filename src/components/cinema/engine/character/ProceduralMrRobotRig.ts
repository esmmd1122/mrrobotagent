import * as THREE from 'three'
import type { CharacterPose } from '../keyframes'
import {
  createEarCupCrownTexture,
  createFabricNormalAndRoughness,
  createSleevePatchTexture,
} from '../textures'
import {
  evaluateAssistantMotion,
  evaluateBlinkEyeScale,
  type AssistantAnimState,
} from './assistant-state'
import { GltfCharacterAdapter } from './GltfCharacterAdapter'
import type {
  CharacterAssetMetadata,
  MrRobotCharacterController,
  PointerNormalized,
} from './types'

type ArmRig = {
  shoulder: THREE.Group
  elbow: THREE.Group
  hand: THREE.Group
}

/**
 * Builds the sharp 3-pointed geometric crown shape matching the official MR.ROBOT emblem.
 */
function createOfficialCrownGeometry(scale = 1, depth = 0.018): THREE.ExtrudeGeometry {
  const s = scale
  const shape = new THREE.Shape()
  shape.moveTo(-0.082 * s, -0.024 * s)
  shape.lineTo(-0.118 * s, 0.068 * s)
  shape.lineTo(-0.038 * s, 0.014 * s)
  shape.lineTo(0, 0.108 * s)
  shape.lineTo(0.038 * s, 0.014 * s)
  shape.lineTo(0.118 * s, 0.068 * s)
  shape.lineTo(0.082 * s, -0.024 * s)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0025 * s,
    bevelSize: 0.0025 * s,
    bevelSegments: 2,
  })
  geo.center()
  return geo
}

/**
 * Official multi-part sculpted 3D MR.ROBOT mascot rig.
 * Faithfully reproduces every signature visual element of the official mascot identity:
 * - Black textured hood with bold 3D red 3-pointed crown emblem on the front brow
 * - Completely dark, smooth faceless obsidian mask (no human face or mouth)
 * - Sharp angular glowing red eyes with independent natural blinking & red inner-hood glow
 * - Large matte-black over-ear studio headphones with crimson side brackets, glowing red LED rings,
 *   and red crown emblems centered on both ear cups
 * - Black tactical hoodie with front metallic zipper, red-and-black drawstrings,
 *   shoulder harness straps with metallic buckles, and official MR.ROBOT sleeve patch + dual red stripes
 * - Subtle glowing crimson circular back-halo ring reacting to assistant AI states
 * - Invisible fast raycast hitProxy for desktop click & mobile tap interaction
 * - Seamless drop-in support for a future rigged .glb/.gltf model via GltfCharacterAdapter
 */
export class ProceduralMrRobotRig implements MrRobotCharacterController {
  readonly root = new THREE.Group()
  readonly hitProxy: THREE.Mesh

  private readonly proceduralRoot = new THREE.Group()
  private readonly customModelSlot = new THREE.Group()
  private readonly bodyRig = new THREE.Group()
  private readonly headRig = new THREE.Group()
  private readonly haloGroup = new THREE.Group()
  private readonly gltfAdapter = new GltfCharacterAdapter()
  private readonly isSoftwareGl: boolean

  private customLabel = 'کاراکتر رسمی سه‌بعدی MR.ROBOT'

  private fabricTex!: { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture }
  private earCupCrownTex!: THREE.CanvasTexture
  private sleevePatchTex!: THREE.CanvasTexture

  private hoodieFabric!: THREE.MeshPhysicalMaterial
  private hoodieInnerFleece!: THREE.MeshPhysicalMaterial
  private shadowMaskMat!: THREE.MeshPhysicalMaterial
  private darkMetalMat!: THREE.MeshPhysicalMaterial
  private brightBuckleMat!: THREE.MeshPhysicalMaterial
  private tacticalStrapMat!: THREE.MeshStandardMaterial
  private leatherCushion!: THREE.MeshPhysicalMaterial
  private redBracketMat!: THREE.MeshStandardMaterial
  private crimsonEyeMat!: THREE.MeshStandardMaterial
  private crimsonRingMat!: THREE.MeshStandardMaterial
  private crownEmblemMat!: THREE.MeshStandardMaterial
  private haloRingMat!: THREE.MeshBasicMaterial
  private haloArcMat!: THREE.MeshBasicMaterial
  private steelCyanAccent!: THREE.MeshStandardMaterial

  private eyesGroup!: THREE.Group
  private leftEye!: THREE.Mesh
  private rightEye!: THREE.Mesh
  private eyeBounceLight!: THREE.PointLight

  private haloAccentArc!: THREE.Mesh

  private leftArm!: ArmRig
  private rightArm!: ArmRig

  private holoOrb!: THREE.Group
  private orbParts!: {
    glassCore: THREE.Mesh
    wireCore: THREE.Mesh
    orbitA: THREE.Mesh
    orbitB: THREE.Mesh
  }

  private blinkTimer = 2.8
  private isBlinking = false
  private blinkT = 0

  private assistantState: AssistantAnimState = 'idle'
  private chatOpen = false
  private stateElapsed = 0
  private attentionOverrideTimer = 0
  private eyePulseOverride = 0

  pose: CharacterPose = {
    lShX: 0.12,
    lShZ: 0.14,
    lElX: -0.42,
    rShX: -0.22,
    rShZ: -0.18,
    rElX: -0.62,
    orbScale: 0.001,
    orbPos: [0.85, 0.52, 0.72],
    eyeGlow: 2.35,
    lookBiasX: 0,
  }

  constructor(options?: { isSoftwareGl?: boolean }) {
    this.isSoftwareGl = Boolean(options?.isSoftwareGl)

    this.root.add(this.proceduralRoot)
    this.root.add(this.customModelSlot)
    this.proceduralRoot.add(this.bodyRig)

    // Optimized invisible hit proxy for raycasting click/tap/hover on the mascot
    this.hitProxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.88, 3.3, 14),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    this.hitProxy.name = 'mr-robot-hit-proxy'
    this.hitProxy.position.set(0, 0.45, 0.05)
    this.hitProxy.userData.isMrRobotMascot = true
    this.root.add(this.hitProxy)

    this.fabricTex = createFabricNormalAndRoughness()
    this.earCupCrownTex = createEarCupCrownTexture()
    this.sleevePatchTex = createSleevePatchTexture()

    this.buildMaterials()
    this.buildCrimsonBackHalo()
    this.buildTacticalHoodieTorso()
    this.buildSculptedHoodAndObsidianMask()
    this.buildOfficialHeadphones()
    this.buildArticulatedTacticalArms()
    this.buildInteractiveHoloOrb()
  }

  private buildMaterials() {
    this.hoodieFabric = new THREE.MeshPhysicalMaterial({
      color: 0x0a0b10,
      roughness: 0.89,
      roughnessMap: this.fabricTex.roughnessMap,
      normalMap: this.fabricTex.normalMap,
      normalScale: new THREE.Vector2(1.35, 1.35),
      metalness: 0.04,
      sheen: 0.9,
      sheenRoughness: 0.58,
      sheenColor: new THREE.Color(0x5c1828),
    })

    this.hoodieInnerFleece = new THREE.MeshPhysicalMaterial({
      color: 0x040509,
      roughness: 0.96,
      normalMap: this.fabricTex.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      sheen: 0.45,
      sheenColor: new THREE.Color(0x6e1022),
    })

    // Completely dark, matte-obsidian faceless mask shell inside hood (no specular hotspot)
    this.shadowMaskMat = new THREE.MeshPhysicalMaterial({
      color: 0x020205,
      roughness: 0.68,
      metalness: 0.08,
      clearcoat: 0.08,
      clearcoatRoughness: 0.55,
    })

    this.darkMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0x161922,
      roughness: 0.28,
      metalness: 0.9,
      clearcoat: 0.4,
      clearcoatRoughness: 0.22,
    })

    this.brightBuckleMat = new THREE.MeshPhysicalMaterial({
      color: 0x5c6678,
      roughness: 0.22,
      metalness: 0.95,
      clearcoat: 0.5,
      clearcoatRoughness: 0.18,
    })

    this.tacticalStrapMat = new THREE.MeshStandardMaterial({
      color: 0x11131a,
      roughness: 0.78,
      metalness: 0.12,
    })

    this.leatherCushion = new THREE.MeshPhysicalMaterial({
      color: 0x0a0b10,
      roughness: 0.46,
      metalness: 0.08,
      sheen: 0.35,
      sheenColor: new THREE.Color(0x2d1822),
    })

    this.redBracketMat = new THREE.MeshStandardMaterial({
      color: 0xb9122e,
      emissive: 0x700718,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.65,
    })

    // Intense sharp deep crimson glowing red eyes (pure red under ACES tone mapping)
    this.crimsonEyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0a28,
      emissive: 0xe6001f,
      emissiveIntensity: 2.35,
      roughness: 0.12,
      toneMapped: false,
    })

    // Illuminated crimson red headphone rings & drawstring tips
    this.crimsonRingMat = new THREE.MeshStandardMaterial({
      color: 0xff0d2e,
      emissive: 0xd9001d,
      emissiveIntensity: 2.2,
      roughness: 0.14,
      toneMapped: false,
    })

    // Bold crimson hood crown emblem
    this.crownEmblemMat = new THREE.MeshStandardMaterial({
      color: 0xe01132,
      emissive: 0x99061d,
      emissiveIntensity: 0.9,
      roughness: 0.28,
      metalness: 0.16,
    })

    this.haloRingMat = new THREE.MeshBasicMaterial({
      color: 0xff1d42,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    this.haloArcMat = new THREE.MeshBasicMaterial({
      color: 0xff4566,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    this.steelCyanAccent = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 2.0,
      roughness: 0.2,
      toneMapped: false,
    })
  }

  private buildCrimsonBackHalo() {
    // Signature glowing red circular halo framing the official mascot's hood & headphones
    this.haloGroup.position.set(0, 1.38, -0.58)
    this.bodyRig.add(this.haloGroup)

    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.96, 0.011, 12, 72),
      this.haloRingMat,
    )
    this.haloGroup.add(outerRing)

    const softAuraRing = new THREE.Mesh(
      new THREE.RingGeometry(0.91, 1.04, 64),
      new THREE.MeshBasicMaterial({
        color: 0xef1d42,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    this.haloGroup.add(softAuraRing)

    this.haloAccentArc = new THREE.Mesh(
      new THREE.TorusGeometry(1.01, 0.008, 10, 48, Math.PI * 0.55),
      this.haloArcMat,
    )
    this.haloGroup.add(this.haloAccentArc)
  }

  private buildTacticalHoodieTorso() {
    const profile = [
      new THREE.Vector2(0.01, -1.32),
      new THREE.Vector2(0.56, -1.28),
      new THREE.Vector2(0.58, -0.82),
      new THREE.Vector2(0.64, -0.22),
      new THREE.Vector2(0.76, 0.36),
      new THREE.Vector2(0.89, 0.72),
      new THREE.Vector2(0.72, 0.91),
      new THREE.Vector2(0.39, 0.98),
      new THREE.Vector2(0.24, 0.94),
    ]
    const torsoGeo = new THREE.LatheGeometry(profile, 64)
    const p = torsoGeo.attributes.position
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i)
      const y = p.getY(i)
      let z = p.getZ(i)
      const angle = Math.atan2(x, z)

      z *= 0.73
      x *= 1.09
      if (z > 0 && y > 0.05 && y < 0.75) {
        z += 0.068 * Math.cos(angle * 2) * Math.sin(((y - 0.05) / 0.7) * Math.PI)
      }

      const foldAmp = THREE.MathUtils.clamp((0.6 - y) * 0.025, 0.005, 0.032)
      const drapery =
        Math.sin(angle * 9 + y * 2.2) * foldAmp +
        Math.cos(angle * 15 - y * 3.1) * foldAmp * 0.45
      x += Math.sin(angle) * drapery
      z += Math.cos(angle) * drapery

      p.setXYZ(i, x, y, z)
    }
    torsoGeo.computeVertexNormals()

    const torsoMesh = new THREE.Mesh(torsoGeo, this.hoodieFabric)
    this.bodyRig.add(torsoMesh)

    // Layered heavy tactical hoodie collar folds
    const collarLayers = [
      { r: 0.45, tube: 0.12, y: 0.94, z: 0.05, rx: 1.72, sx: 1.13, sy: 0.96 },
      { r: 0.53, tube: 0.098, y: 0.84, z: 0.075, rx: 1.84, sx: 1.17, sy: 0.92 },
      { r: 0.6, tube: 0.075, y: 0.74, z: 0.085, rx: 1.92, sx: 1.13, sy: 0.88 },
    ]
    collarLayers.forEach((c, idx) => {
      const geo = new THREE.TorusGeometry(c.r, c.tube, 24, 56)
      const pos = geo.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i)
        const vy = pos.getY(i)
        const vz = pos.getZ(i)
        const wave = Math.sin(Math.atan2(vy, vx) * 6 + idx * 1.4) * 0.018
        pos.setXYZ(i, vx, vy + wave, vz + wave * 0.7)
      }
      geo.computeVertexNormals()
      const mesh = new THREE.Mesh(geo, idx === 0 ? this.hoodieInnerFleece : this.hoodieFabric)
      mesh.rotation.x = c.rx
      mesh.position.set(0, c.y, c.z)
      mesh.scale.set(c.sx, c.sy, 1.0)
      this.bodyRig.add(mesh)
    })

    // Center Metallic Front Zipper (signature detail from official mascot)
    const zipperCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.82, 0.53),
      new THREE.Vector3(0, 0.42, 0.655),
      new THREE.Vector3(0, -0.12, 0.595),
      new THREE.Vector3(0, -0.78, 0.515),
    ])
    const zipperTrack = new THREE.Mesh(
      new THREE.TubeGeometry(zipperCurve, 28, 0.015, 8, false),
      this.darkMetalMat,
    )
    this.bodyRig.add(zipperTrack)

    // Metallic zipper teeth highlights + zipper pull tab
    const toothGeo = new THREE.BoxGeometry(0.038, 0.012, 0.016)
    const teethMesh = new THREE.InstancedMesh(toothGeo, this.brightBuckleMat, 26)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 26; i++) {
      const t = i / 25
      const pt = zipperCurve.getPoint(t)
      dummy.position.set(pt.x, pt.y, pt.z + 0.01)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      teethMesh.setMatrixAt(i, dummy.matrix)
    }
    teethMesh.computeBoundingSphere()
    this.bodyRig.add(teethMesh)

    const zipperSlider = new THREE.Mesh(
      new THREE.BoxGeometry(0.044, 0.052, 0.032),
      this.brightBuckleMat,
    )
    zipperSlider.position.set(0, 0.69, 0.595)
    this.bodyRig.add(zipperSlider)

    const zipperPull = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, 0.075, 0.012),
      this.brightBuckleMat,
    )
    zipperPull.position.set(0, 0.635, 0.618)
    zipperPull.rotation.x = -0.18
    this.bodyRig.add(zipperPull)

    // Red-and-Black Braided Drawstrings with metallic & red-tipped aglets
    ;[-0.135, 0.135].forEach((side, i) => {
      const eyelet = new THREE.Mesh(
        new THREE.TorusGeometry(0.022, 0.006, 8, 16),
        this.brightBuckleMat,
      )
      eyelet.position.set(side * 0.9, 0.86, 0.46)
      this.bodyRig.add(eyelet)

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.9, 0.86, 0.465),
        new THREE.Vector3(side * 1.12, 0.56, 0.61),
        new THREE.Vector3(side * 1.05, 0.22 - i * 0.04, 0.585),
      ])
      const cord = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.013, 10, false),
        this.redBracketMat,
      )
      this.bodyRig.add(cord)

      const aglet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.068, 12),
        this.darkMetalMat,
      )
      aglet.position.set(side * 1.05, 0.19 - i * 0.04, 0.585)
      this.bodyRig.add(aglet)

      const agletTip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.017, 0.017, 0.018, 12),
        this.crimsonRingMat,
      )
      agletTip.position.set(side * 1.05, 0.155 - i * 0.04, 0.585)
      this.bodyRig.add(agletTip)
    })

    // Tactical Shoulder Harness Straps & Brushed Metallic Rectangular Buckles (official mascot detail)
    ;[-1, 1].forEach((side) => {
      const strapCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.46, 0.86, -0.34),
        new THREE.Vector3(side * 0.54, 0.93, 0.08),
        new THREE.Vector3(side * 0.46, 0.64, 0.51),
        new THREE.Vector3(side * 0.38, 0.24, 0.58),
        new THREE.Vector3(side * 0.34, -0.22, 0.51),
      ])
      const strapGeo = new THREE.TubeGeometry(strapCurve, 32, 0.036, 8, false)
      strapGeo.scale(1.0, 1.0, 0.42)
      const strapMesh = new THREE.Mesh(strapGeo, this.tacticalStrapMat)
      strapMesh.position.z = 0.05
      this.bodyRig.add(strapMesh)

      // Upper shoulder red harness accent tab
      const redTab = new THREE.Mesh(
        new THREE.BoxGeometry(0.088, 0.038, 0.032),
        this.redBracketMat,
      )
      redTab.position.set(side * 0.52, 0.82, 0.43)
      redTab.rotation.set(0.52, side * 0.24, -side * 0.12)
      this.bodyRig.add(redTab)

      // Metallic rectangular harness buckle on chest strap
      const buckleGroup = new THREE.Group()
      buckleGroup.position.set(side * 0.44, 0.53, 0.585)
      buckleGroup.rotation.set(-0.18, side * 0.32, -side * 0.1)

      const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.115, 0.018, 0.022),
        this.brightBuckleMat,
      )
      topBar.position.y = 0.046
      const botBar = topBar.clone()
      botBar.position.y = -0.046
      const midBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.105, 0.014, 0.02),
        this.brightBuckleMat,
      )
      const leftSide = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.11, 0.022),
        this.brightBuckleMat,
      )
      leftSide.position.x = -0.05
      const rightSide = leftSide.clone()
      rightSide.position.x = 0.05

      buckleGroup.add(topBar, botBar, midBar, leftSide, rightSide)
      this.bodyRig.add(buckleGroup)
    })
  }

  private buildSculptedHoodAndObsidianMask() {
    this.headRig.position.set(0, 1.4, 0.02)
    this.bodyRig.add(this.headRig)

    const hoodGeo = new THREE.SphereGeometry(0.585, 64, 48)
    const pos = hoodGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i)
      let y = pos.getY(i)
      let z = pos.getZ(i)

      if (y > 0.08) {
        const topT = (y - 0.08) / 0.5
        y += 0.17 * Math.pow(topT, 1.45)
        z -= 0.09 * topT
        x *= 1.0 - 0.08 * topT
      }

      if (z > 0.1) {
        const fT = (z - 0.1) / 0.485
        const faceEll = (x / 0.405) * (x / 0.405) + ((y - 0.01) / 0.455) * ((y - 0.01) / 0.455)
        if (faceEll < 1.0 && z > 0.16) {
          const depthT = Math.pow(1.0 - faceEll, 0.65)
          z = THREE.MathUtils.lerp(z + 0.12 * fT, -0.04, depthT)
          x *= 1.0 - 0.06 * depthT
        } else if (y > 0.04) {
          z += 0.22 * Math.pow(fT, 1.15)
          y += 0.03 * fT
          x *= 0.94
        } else {
          x *= 1.04 + 0.08 * fT
          z += 0.08 * fT
        }
      }

      if (y < -0.2) {
        const lowT = (-y - 0.2) / 0.385
        x *= 1.0 + 0.26 * lowT
        z *= 1.0 + 0.18 * lowT
      }

      const fold = Math.sin(x * 11 + y * 5) * 0.014 + Math.cos(z * 10 - y * 6) * 0.011
      x += fold * (x >= 0 ? 1 : -1) * 0.65
      z += fold * 0.5

      pos.setXYZ(i, x, y, z)
    }
    hoodGeo.computeVertexNormals()
    const outerHood = new THREE.Mesh(hoodGeo, this.hoodieFabric)
    this.headRig.add(outerHood)

    // Bold 3D Red Crown Emblem seated cleanly proud on the front brow of the hood (official mascot signature!)
    const hoodCrownGroup = new THREE.Group()
    hoodCrownGroup.position.set(0, 0.565, 0.555)
    hoodCrownGroup.rotation.set(-0.56, 0, 0)

    const crownMain = new THREE.Mesh(
      createOfficialCrownGeometry(1.16, 0.022),
      this.crownEmblemMat,
    )
    const crownBaseBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.185, 0.02, 0.022),
      this.crownEmblemMat,
    )
    crownBaseBar.position.set(0, -0.092, 0)
    hoodCrownGroup.add(crownMain, crownBaseBar)
    this.headRig.add(hoodCrownGroup)

    // Thick turned-in hood brim hem
    const hemCurvePts: THREE.Vector3[] = []
    for (let a = 0; a < 36; a++) {
      const theta = (a / 36) * Math.PI * 2
      const rx = Math.cos(theta) * 0.415
      const ry = Math.sin(theta) * 0.495 + 0.02
      const browPush = Math.max(0, Math.sin(theta)) * 0.165
      const rz = 0.35 + browPush + Math.sin(theta * 3) * 0.015
      hemCurvePts.push(new THREE.Vector3(rx, ry, rz))
    }
    const hemCurve = new THREE.CatmullRomCurve3(hemCurvePts, true)
    const hemGeo = new THREE.TubeGeometry(hemCurve, 72, 0.058, 16, true)
    const hemMesh = new THREE.Mesh(hemGeo, this.hoodieFabric)
    this.headRig.add(hemMesh)

    const innerLiner = new THREE.Mesh(
      new THREE.SphereGeometry(0.435, 36, 28),
      this.hoodieInnerFleece,
    )
    innerLiner.scale.set(0.9, 1.02, 0.78)
    this.headRig.add(innerLiner)

    // Smooth dark faceless obsidian mask (completely faceless, zero mouth)
    const obsidianMask = new THREE.Mesh(
      new THREE.SphereGeometry(0.355, 36, 28),
      this.shadowMaskMat,
    )
    obsidianMask.position.set(0, -0.02, 0.1)
    obsidianMask.scale.set(0.85, 1.04, 0.89)
    this.headRig.add(obsidianMask)

    // Sharp fierce angular glowing red eyes matching official MR.ROBOT silhouette
    const eyeShape = new THREE.Shape()
    eyeShape.moveTo(-0.105, 0.032)
    eyeShape.quadraticCurveTo(-0.015, 0.056, 0.095, -0.022)
    eyeShape.quadraticCurveTo(0.005, -0.036, -0.105, 0.032)

    const leftEyeGeo = new THREE.ExtrudeGeometry(eyeShape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
    })
    leftEyeGeo.center()

    const rightEyeShape = new THREE.Shape()
    rightEyeShape.moveTo(0.105, 0.032)
    rightEyeShape.quadraticCurveTo(0.015, 0.056, -0.095, -0.022)
    rightEyeShape.quadraticCurveTo(-0.005, -0.036, 0.105, 0.032)

    const rightEyeGeo = new THREE.ExtrudeGeometry(rightEyeShape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
    })
    rightEyeGeo.center()

    this.eyesGroup = new THREE.Group()
    this.eyesGroup.position.set(0, 0.038, 0.425)
    this.headRig.add(this.eyesGroup)

    this.leftEye = new THREE.Mesh(leftEyeGeo, this.crimsonEyeMat)
    this.leftEye.position.set(-0.132, 0, -0.006)
    this.leftEye.rotation.set(0.04, -0.26, -0.08)

    this.rightEye = new THREE.Mesh(rightEyeGeo, this.crimsonEyeMat)
    this.rightEye.position.set(0.132, 0, -0.006)
    this.rightEye.rotation.set(0.04, 0.26, 0.08)

    this.eyesGroup.add(this.leftEye, this.rightEye)

    // Soft crimson eye glow cast inside the hood opening without specular hotspot on mask
    this.eyeBounceLight = new THREE.PointLight(0xff1030, 1.5, 2.2, 2)
    this.eyeBounceLight.position.set(0, 0.08, 0.48)
    this.headRig.add(this.eyeBounceLight)
  }

  private buildOfficialHeadphones() {
    const hp = new THREE.Group()
    this.headRig.add(hp)

    // Heavy matte-black over-ear headband arch
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.648, 0.048, 18, 60, Math.PI * 1.06),
      this.darkMetalMat,
    )
    arch.position.set(0, 0.08, -0.02)
    arch.rotation.z = -0.03 * Math.PI
    arch.scale.set(1.03, 1.13, 1.42)
    hp.add(arch)

    // Soft padded headband underside
    const innerPad = new THREE.Mesh(
      new THREE.TorusGeometry(0.605, 0.034, 14, 48, Math.PI * 0.84),
      this.leatherCushion,
    )
    innerPad.position.set(0, 0.08, -0.02)
    innerPad.rotation.z = 0.08 * Math.PI
    innerPad.scale.set(1.03, 1.13, 1.24)
    hp.add(innerPad)

    // Red metallic side accent slider arcs on the headband (exact reference detail!)
    ;[-1, 1].forEach((side) => {
      const sliderArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.668, 0.018, 10, 24, Math.PI * 0.18),
        this.redBracketMat,
      )
      sliderArc.position.set(0, 0.08, -0.02)
      sliderArc.rotation.z = side < 0 ? Math.PI * 0.78 : Math.PI * 0.04
      sliderArc.scale.set(1.03, 1.13, 1.45)
      hp.add(sliderArc)
    })

    const earCupFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.earCupCrownTex,
      emissive: 0x3b040e,
      emissiveMap: this.earCupCrownTex,
      emissiveIntensity: 0.7,
      roughness: 0.34,
      metalness: 0.45,
    })

    ;[-1, 1].forEach((side) => {
      const cup = new THREE.Group()
      cup.position.set(side * 0.65, -0.02, 0.0)
      cup.rotation.z = side * 0.07

      const yoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, 0.25, 12),
        this.darkMetalMat,
      )
      yoke.position.set(side * 0.042, 0.19, 0)
      cup.add(yoke)

      // Thick ribbed black leather ear cushion
      const cushion = new THREE.Mesh(
        new THREE.TorusGeometry(0.172, 0.072, 18, 36),
        this.leatherCushion,
      )
      cushion.rotation.y = Math.PI / 2
      cushion.position.x = -side * 0.02
      cup.add(cushion)

      // Deep beveled black ear cup housing
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.165, 0.205, 0.125, 36),
        this.darkMetalMat,
      )
      shell.rotation.z = Math.PI / 2
      shell.position.x = side * 0.068
      cup.add(shell)

      // Center cap with official red MR.ROBOT crown emblem on BOTH ear cups
      const crownCap = new THREE.Mesh(
        new THREE.CircleGeometry(0.138, 36),
        earCupFaceMat,
      )
      crownCap.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2
      crownCap.position.x = side * 0.134
      cup.add(crownCap)

      // Bright illuminated crimson LED ring framing the ear-cup crown
      const redRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.148, 0.013, 14, 44),
        this.crimsonRingMat,
      )
      redRing.rotation.y = Math.PI / 2
      redRing.position.x = side * 0.131
      cup.add(redRing)

      hp.add(cup)
    })
  }

  private buildArticulatedTacticalArms() {
    const sleevePatchMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.sleevePatchTex,
      transparent: true,
      roughness: 0.65,
      metalness: 0.08,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })

    const buildArm = (side: -1 | 1): ArmRig => {
      const shoulder = new THREE.Group()
      shoulder.position.set(side * 0.88, 0.69, 0.02)

      const shoulderCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.215, 24, 20),
        this.hoodieFabric,
      )
      shoulderCap.scale.set(0.96, 1.08, 0.92)
      shoulder.add(shoulderCap)

      const upper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.155, 0.72, 24),
        this.hoodieFabric,
      )
      upper.position.y = -0.35
      shoulder.add(upper)

      // Official MR.ROBOT tactical sleeve patch + dual red stripes wrapped on upper sleeve
      const patchArcStart = side < 0 ? -Math.PI * 0.85 : Math.PI * 0.12
      const patchGeo = new THREE.CylinderGeometry(
        0.186,
        0.168,
        0.34,
        24,
        1,
        true,
        patchArcStart,
        Math.PI * 0.74,
      )
      const patchMesh = new THREE.Mesh(patchGeo, sleevePatchMat)
      patchMesh.position.y = -0.3
      shoulder.add(patchMesh)

      const elbow = new THREE.Group()
      elbow.position.set(0, -0.7, 0)
      shoulder.add(elbow)

      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.154, 0.115, 0.62, 24),
        this.hoodieFabric,
      )
      forearm.position.y = -0.3
      elbow.add(forearm)

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115, 0.1, 0.092, 24),
        this.hoodieInnerFleece,
      )
      cuff.position.y = -0.6
      elbow.add(cuff)

      // Subtle crimson cuff trim matching black-and-red tactical hoodie palette
      const cuffLine = new THREE.Mesh(
        new THREE.TorusGeometry(0.108, 0.007, 10, 28),
        this.redBracketMat,
      )
      cuffLine.rotation.x = Math.PI / 2
      cuffLine.position.y = -0.57
      elbow.add(cuffLine)

      const hand = new THREE.Group()
      hand.position.set(0, -0.68, 0)

      const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.135, 0.165, 0.068),
        this.leatherCushion,
      )
      hand.add(palm)

      const knucklePlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.125, 0.036, 0.076),
        this.darkMetalMat,
      )
      knucklePlate.position.y = -0.025
      hand.add(knucklePlate)

      for (let f = -1.5; f <= 1.5; f += 1) {
        const finger = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.013, 0.095, 6, 10),
          this.leatherCushion,
        )
        finger.position.set(f * 0.032, -0.125, 0.018)
        finger.rotation.x = 0.28 + Math.abs(f) * 0.05
        hand.add(finger)
      }

      const thumb = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.014, 0.065, 6, 10),
        this.leatherCushion,
      )
      thumb.position.set(-side * 0.075, -0.03, 0.03)
      thumb.rotation.z = side * 0.55
      thumb.rotation.x = 0.35
      hand.add(thumb)

      elbow.add(hand)
      this.bodyRig.add(shoulder)
      return { shoulder, elbow, hand }
    }

    this.leftArm = buildArm(-1)
    this.rightArm = buildArm(1)
  }

  private buildInteractiveHoloOrb() {
    this.holoOrb = new THREE.Group()
    this.holoOrb.position.set(0.85, 0.52, 0.72)
    this.holoOrb.scale.setScalar(0.001)
    this.holoOrb.visible = false
    this.root.add(this.holoOrb)

    const glassCoreMat = this.isSoftwareGl
      ? new THREE.MeshPhysicalMaterial({
          color: 0x93c5fd,
          roughness: 0.15,
          metalness: 0.25,
          transparent: true,
          opacity: 0.55,
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0x93c5fd,
          roughness: 0.08,
          metalness: 0.1,
          transmission: 0.72,
          thickness: 0.5,
          ior: 1.45,
        })

    const glassCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2), glassCoreMat)
    const wireCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.24, 1),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.48,
      }),
    )
    const orbitA = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.007, 10, 56),
      this.steelCyanAccent,
    )
    orbitA.rotation.x = 1.05
    const orbitB = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.005, 10, 56),
      this.crimsonRingMat,
    )
    orbitB.rotation.y = 0.85

    this.orbParts = { glassCore, wireCore, orbitA, orbitB }
    this.holoOrb.add(glassCore, wireCore, orbitA, orbitB)
  }

  getAssetMetadata(): CharacterAssetMetadata {
    return {
      mode: this.gltfAdapter.isLoaded ? 'official-gltf' : 'procedural-reference',
      sourceLabel: this.customLabel,
      animationClips: this.gltfAdapter.clipNames,
      activeClip: this.gltfAdapter.activeClip,
    }
  }

  setAssistantState(state: AssistantAnimState, chatOpen?: boolean) {
    if (state !== this.assistantState) {
      this.assistantState = state
      this.stateElapsed = 0
      this.gltfAdapter.applyAssistantState(state)
    }
    if (typeof chatOpen === 'boolean') {
      this.chatOpen = chatOpen
    }
  }

  triggerAttention(durationSec = 1.25) {
    this.attentionOverrideTimer = Math.max(this.attentionOverrideTimer, durationSec)
    this.stateElapsed = 0
    this.eyePulseOverride = 5.4
    this.gltfAdapter.applyAssistantState('attention')
  }

  async loadOfficialModel(
    urlOrBlobUrl: string,
    label = 'مدل رسمی MR.ROBOT (.glb)',
  ): Promise<CharacterAssetMetadata> {
    await this.gltfAdapter.load(urlOrBlobUrl, this.customModelSlot)
    this.proceduralRoot.visible = false
    this.customLabel = label
    this.gltfAdapter.applyAssistantState(this.assistantState)
    return this.getAssetMetadata()
  }

  playAnimationClip(clipName: string): boolean {
    return this.gltfAdapter.playClip(clipName)
  }

  resetToReferenceRig(): CharacterAssetMetadata {
    this.gltfAdapter.clear(this.customModelSlot)
    this.proceduralRoot.visible = true
    this.customLabel = 'کاراکتر رسمی سه‌بعدی MR.ROBOT'
    return this.getAssetMetadata()
  }

  setEyePulseBoost(intensity: number) {
    this.eyePulseOverride = intensity
    this.crimsonEyeMat.emissiveIntensity = intensity
  }

  update(
    elapsed: number,
    delta: number,
    mouse: PointerNormalized,
    reducedMotion: boolean,
    productDragImpulse: number,
  ) {
    const m = reducedMotion ? 0.25 : 1.0
    const usingCustom = this.gltfAdapter.isLoaded

    this.stateElapsed += delta
    if (this.attentionOverrideTimer > 0) {
      this.attentionOverrideTimer = Math.max(0, this.attentionOverrideTimer - delta)
    }

    const effectiveState: AssistantAnimState =
      this.attentionOverrideTimer > 0 && this.assistantState === 'idle'
        ? 'attention'
        : this.assistantState

    const motion = evaluateAssistantMotion(
      effectiveState,
      elapsed,
      this.stateElapsed,
      reducedMotion,
      this.chatOpen,
    )

    if (usingCustom) {
      this.gltfAdapter.update(delta, mouse, this.pose.lookBiasX, reducedMotion, motion)
    }

    // Subtle organic breathing + restrained speaking/acknowledgment upper-body cadence
    const breath = Math.sin(elapsed * 1.65) * m * motion.breathScale
    const targetRig = usingCustom ? this.customModelSlot : this.bodyRig
    targetRig.position.y = breath * 0.036

    if (!usingCustom) {
      this.bodyRig.scale.set(1 + breath * 0.011, 1 + breath * 0.008, 1 + breath * 0.011)
      this.bodyRig.rotation.x = THREE.MathUtils.damp(
        this.bodyRig.rotation.x,
        motion.bodyPitchOffset,
        6,
        delta,
      )

      const gazeY =
        THREE.MathUtils.clamp(mouse.x * 0.34 + this.pose.lookBiasX, -0.52, 0.52) * m +
        motion.headYawOffset
      const gazeX =
        THREE.MathUtils.clamp(-mouse.y * 0.16, -0.2, 0.2) * m + motion.headPitchOffset

      this.headRig.rotation.y = THREE.MathUtils.damp(this.headRig.rotation.y, gazeY, 6, delta)
      this.headRig.rotation.x = THREE.MathUtils.damp(this.headRig.rotation.x, gazeX, 6, delta)
      this.headRig.rotation.z = THREE.MathUtils.damp(
        this.headRig.rotation.z,
        motion.headRollOffset,
        5,
        delta,
      )

      // Independent natural sharp-eye blinking (preserving fierce crimson eye geometry)
      this.blinkTimer -= delta
      if (this.blinkTimer <= 0 && !this.isBlinking) {
        this.isBlinking = true
        this.blinkT = 0
        this.blinkTimer = 3.2 + Math.random() * 2.8
      }
      if (this.isBlinking) {
        this.blinkT += delta * 11.2
        if (this.blinkT >= Math.PI) {
          this.isBlinking = false
          this.blinkT = 0
        }
      }
      const eyeSY = evaluateBlinkEyeScale(this.blinkT, this.isBlinking)
      this.leftEye.scale.y = eyeSY
      this.rightEye.scale.y = eyeSY

      // Controlled crimson eye illumination + headphone LED rings + back halo response
      const targetEyeGlow = Math.max(
        this.pose.eyeGlow * motion.eyeGlowMultiplier,
        this.eyePulseOverride,
      )
      this.eyePulseOverride = THREE.MathUtils.damp(this.eyePulseOverride, 0, 3.5, delta)

      this.crimsonEyeMat.emissiveIntensity = THREE.MathUtils.damp(
        this.crimsonEyeMat.emissiveIntensity,
        targetEyeGlow,
        6,
        delta,
      )
      this.crimsonRingMat.emissiveIntensity = THREE.MathUtils.damp(
        this.crimsonRingMat.emissiveIntensity,
        motion.ringGlowIntensity * 0.72,
        5,
        delta,
      )
      this.eyeBounceLight.intensity = 1.45 * eyeSY * motion.eyeGlowMultiplier

      // Back halo subtle breathing & neural thinking arc spin
      this.haloRingMat.opacity = THREE.MathUtils.damp(
        this.haloRingMat.opacity,
        THREE.MathUtils.clamp(0.42 * motion.haloIntensity, 0.25, 0.92),
        5,
        delta,
      )
      this.haloArcMat.opacity = THREE.MathUtils.damp(
        this.haloArcMat.opacity,
        THREE.MathUtils.clamp(0.55 * motion.haloIntensity, 0.3, 1.0),
        5,
        delta,
      )
      this.haloAccentArc.rotation.z += delta * motion.haloSpinSpeed

      // Articulated tactical arms with smooth posture damping
      const wave = Math.sin(elapsed * 1.25) * 0.04 * m
      const dragGesture = THREE.MathUtils.clamp(productDragImpulse * 2.8, -0.35, 0.35)

      this.leftArm.shoulder.rotation.x = THREE.MathUtils.damp(
        this.leftArm.shoulder.rotation.x,
        this.pose.lShX + wave - dragGesture * 0.4 + motion.armLiftOffset,
        5,
        delta,
      )
      this.leftArm.shoulder.rotation.z = THREE.MathUtils.damp(
        this.leftArm.shoulder.rotation.z,
        this.pose.lShZ,
        5,
        delta,
      )
      this.leftArm.elbow.rotation.x = THREE.MathUtils.damp(
        this.leftArm.elbow.rotation.x,
        this.pose.lElX - wave * 0.6,
        5,
        delta,
      )

      this.rightArm.shoulder.rotation.x = THREE.MathUtils.damp(
        this.rightArm.shoulder.rotation.x,
        this.pose.rShX - wave + motion.armLiftOffset,
        5,
        delta,
      )
      this.rightArm.shoulder.rotation.z = THREE.MathUtils.damp(
        this.rightArm.shoulder.rotation.z,
        this.pose.rShZ,
        5,
        delta,
      )
      this.rightArm.elbow.rotation.x = THREE.MathUtils.damp(
        this.rightArm.elbow.rotation.x,
        this.pose.rElX + wave * 0.7,
        5,
        delta,
      )
    }

    // Floating interactive Holo-Orb (used in story chapters)
    const oScale = THREE.MathUtils.damp(this.holoOrb.scale.x, this.pose.orbScale, 5, delta)
    this.holoOrb.scale.setScalar(Math.max(0.001, oScale))
    this.holoOrb.visible = oScale > 0.015
    this.holoOrb.position.x = THREE.MathUtils.damp(
      this.holoOrb.position.x,
      this.pose.orbPos[0],
      5,
      delta,
    )
    this.holoOrb.position.y = THREE.MathUtils.damp(
      this.holoOrb.position.y,
      this.pose.orbPos[1] + Math.sin(elapsed * 2.0) * 0.06 * m,
      5,
      delta,
    )
    this.holoOrb.position.z = THREE.MathUtils.damp(
      this.holoOrb.position.z,
      this.pose.orbPos[2],
      5,
      delta,
    )

    this.orbParts.glassCore.rotation.y += delta * 0.55 * m
    this.orbParts.wireCore.rotation.x -= delta * 0.42 * m
    this.orbParts.orbitA.rotation.z += delta * 0.9 * m
    this.orbParts.orbitB.rotation.x -= delta * 0.65 * m
  }

  dispose() {
    this.gltfAdapter.clear(this.customModelSlot)
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    const collect = (group: THREE.Object3D) => {
      group.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        geometries.add(mesh.geometry)
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => materials.add(m))
        } else if (mesh.material) {
          materials.add(mesh.material)
        }
      })
    }
    collect(this.proceduralRoot)
    collect(this.holoOrb)
    collect(this.hitProxy)
    geometries.forEach((g) => g.dispose())
    materials.forEach((m) => m.dispose())
    this.fabricTex.normalMap.dispose()
    this.fabricTex.roughnessMap.dispose()
    this.earCupCrownTex.dispose()
    this.sleevePatchTex.dispose()
  }
}
