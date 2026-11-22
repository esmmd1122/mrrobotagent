import * as THREE from 'three'
import type { CharacterPose } from '../keyframes'
import {
  createEarCupCrownTexture,
  createFabricNormalAndRoughness,
  createSleevePatchTexture,
  createSoftRadialGlowTexture,
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

/**
 * Builds the official MR.ROBOT 3-pointed sharp flared geometric crown geometry
 * curved gently on X/Y so it sits flush along the front brow of the hood.
 */
function createCurvedHoodCrownGeometry(scale = 1, depth = 0.016): THREE.BufferGeometry {
  const s = scale
  const shape = new THREE.Shape()
  // Flared outer peaks + tall sharp central peak matching IMG_0544 reference
  shape.moveTo(-0.072 * s, -0.022 * s)
  shape.lineTo(-0.112 * s, 0.062 * s)
  shape.lineTo(-0.036 * s, 0.014 * s)
  shape.lineTo(0, 0.116 * s)
  shape.lineTo(0.036 * s, 0.014 * s)
  shape.lineTo(0.112 * s, 0.062 * s)
  shape.lineTo(0.072 * s, -0.022 * s)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.002 * s,
    bevelSize: 0.002 * s,
    bevelSegments: 2,
    curveSegments: 8,
  })
  geo.center()

  // Wrap gently onto the curved hood brow surface so all 3 crown peaks remain crisp and proud
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const curveBack = -(x * x * 0.72 + y * y * 0.34)
    pos.setZ(i, z + curveBack)
  }
  geo.computeVertexNormals()
  return geo
}

/**
 * Builds a tapered, fabric-creased tubular hoodie sleeve along a 3D anatomical curve.
 */
function createSculptedSleeveGeometry(
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  radialSegments: number,
  radiusFn: (t: number) => number,
  foldPhase = 0,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(tubularSegments, false)
  const vertexCount = (tubularSegments + 1) * (radialSegments + 1)
  const positions = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const indices: number[] = []

  const point = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const binormal = new THREE.Vector3()
  const vertex = new THREE.Vector3()

  let vIdx = 0
  let uvIdx = 0

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments
    curve.getPointAt(t, point)
    normal.copy(frames.normals[i])
    binormal.copy(frames.binormals[i])
    const baseR = radiusFn(t)

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2
      const sin = Math.sin(v)
      const cos = -Math.cos(v)

      // Organic heavy cotton hoodie sleeve wrinkles (stronger near elbow bend)
      const bendFactor = Math.sin(t * Math.PI)
      const crease =
        (Math.sin(t * Math.PI * 10 + v * 2 + foldPhase) * 0.008 +
          Math.cos(v * 5 - t * Math.PI * 6 + foldPhase) * 0.005) *
        (0.45 + 0.55 * bendFactor)
      const r = baseR + crease

      vertex.x = point.x + r * (cos * normal.x + sin * binormal.x)
      vertex.y = point.y + r * (cos * normal.y + sin * binormal.y)
      vertex.z = point.z + r * (cos * normal.z + sin * binormal.z)

      positions[vIdx++] = vertex.x
      positions[vIdx++] = vertex.y
      positions[vIdx++] = vertex.z

      uvs[uvIdx++] = j / radialSegments
      uvs[uvIdx++] = t
    }
  }

  const stride = radialSegments + 1
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j
      const b = (i + 1) * stride + j
      const c = (i + 1) * stride + (j + 1)
      const d = i * stride + (j + 1)
      indices.push(a, b, d)
      indices.push(b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/**
 * Official multi-part sculpted 3D MR.ROBOT mascot rig.
 * Faithfully reproduces the uploaded official MR.ROBOT visual reference:
 * - Oversized heavy matte-black fabric hood with draped cowl folds & curved red 3-point crown emblem
 * - Completely dark, smooth faceless obsidian mask with contoured tactical brow bevel (zero mouth/nose)
 * - Fierce, sharp swept glowing red eyes with incandescent core, soft crimson halo, & natural blinking
 * - Large black over-ear studio headphones worn over the hood with gunmetal sliders, illuminated red rings,
 *   and glowing red crown emblems centered on both ear cups
 * - Black tactical zip-up hoodie with silver-gunmetal front zipper, red braided drawstrings with metal aglets,
 *   tactical backpack behind shoulders, dual harness straps with red shoulder tabs & brushed metal buckles
 * - Confident crossed-arms posture with sculpted heavy sleeve folds and official MR.ROBOT sleeve patch +
 *   two slanted red stripes prominently visible on the right upper arm
 * - Crisp glowing neon-red circular back-halo ring & subtle red atmospheric rim aura
 * - Invisible raycast hitProxy for click/tap interaction + seamless drop-in GLB/GLTF upgrade adapter
 */
export class ProceduralMrRobotRig implements MrRobotCharacterController {
  readonly root = new THREE.Group()
  readonly hitProxy: THREE.Mesh

  private readonly proceduralRoot = new THREE.Group()
  private readonly customModelSlot = new THREE.Group()
  private readonly bodyRig = new THREE.Group()
  private readonly headRig = new THREE.Group()
  private readonly crossedArmsRig = new THREE.Group()
  private readonly haloGroup = new THREE.Group()
  private readonly gltfAdapter = new GltfCharacterAdapter()
  private readonly isSoftwareGl: boolean

  private customLabel = 'کاراکتر رسمی سه‌بعدی MR.ROBOT'

  private fabricTex!: { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture }
  private earCupCrownTex!: THREE.CanvasTexture
  private sleevePatchTex!: THREE.CanvasTexture
  private eyeGlowTex!: THREE.CanvasTexture
  private mistGlowTex!: THREE.CanvasTexture

  private hoodieFabric!: THREE.MeshPhysicalMaterial
  private hoodieInnerFleece!: THREE.MeshPhysicalMaterial
  private backpackShellMat!: THREE.MeshPhysicalMaterial
  private shadowMaskMat!: THREE.MeshPhysicalMaterial
  private maskBrowMat!: THREE.MeshPhysicalMaterial
  private darkMetalMat!: THREE.MeshPhysicalMaterial
  private brightBuckleMat!: THREE.MeshPhysicalMaterial
  private tacticalStrapMat!: THREE.MeshStandardMaterial
  private leatherCushion!: THREE.MeshPhysicalMaterial
  private redAccentFabricMat!: THREE.MeshStandardMaterial
  private crimsonEyeMat!: THREE.MeshStandardMaterial
  private crimsonEyeCoreMat!: THREE.MeshBasicMaterial
  private eyeHaloSpriteMat!: THREE.MeshBasicMaterial
  private crimsonRingMat!: THREE.MeshStandardMaterial
  private crimsonRingCoreMat!: THREE.MeshBasicMaterial
  private crownEmblemMat!: THREE.MeshStandardMaterial
  private haloRingMat!: THREE.MeshBasicMaterial
  private haloCoreMat!: THREE.MeshBasicMaterial
  private haloArcMat!: THREE.MeshBasicMaterial
  private mistPlaneMat!: THREE.MeshBasicMaterial
  private steelCyanAccent!: THREE.MeshStandardMaterial

  private eyesGroup!: THREE.Group
  private leftEyeAssembly!: THREE.Group
  private rightEyeAssembly!: THREE.Group
  private eyeBounceLight!: THREE.PointLight

  private haloAccentArc!: THREE.Mesh
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
    eyeGlow: 2.8,
    lookBiasX: 0,
  }

  constructor(options?: { isSoftwareGl?: boolean }) {
    this.isSoftwareGl = Boolean(options?.isSoftwareGl)

    this.root.add(this.proceduralRoot)
    this.root.add(this.customModelSlot)
    this.proceduralRoot.add(this.bodyRig)

    // Optimized invisible hit proxy for fast raycasting click/tap/hover on the mascot
    this.hitProxy = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 0.94, 3.2, 14),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    this.hitProxy.name = 'mr-robot-hit-proxy'
    this.hitProxy.position.set(0, 0.45, 0.08)
    this.hitProxy.userData.isMrRobotMascot = true
    this.root.add(this.hitProxy)

    this.fabricTex = createFabricNormalAndRoughness()
    this.earCupCrownTex = createEarCupCrownTexture()
    this.sleevePatchTex = createSleevePatchTexture()
    this.eyeGlowTex = createSoftRadialGlowTexture(
      'rgba(255, 195, 206, 0.92)',
      'rgba(255, 20, 52, 0.55)',
      'rgba(215, 6, 36, 0)',
    )
    this.mistGlowTex = createSoftRadialGlowTexture(
      'rgba(239, 24, 58, 0.36)',
      'rgba(185, 12, 40, 0.14)',
      'rgba(120, 4, 24, 0)',
    )

    this.buildMaterials()
    this.buildCrimsonBackHalo()
    this.buildTacticalHoodieTorso()
    this.buildTacticalBackpack()
    this.buildSculptedHoodAndObsidianMask()
    this.buildOfficialHeadphones()
    this.buildCrossedTacticalArms()
    this.buildInteractiveHoloOrb()
  }

  private buildMaterials() {
    this.hoodieFabric = new THREE.MeshPhysicalMaterial({
      color: 0x0e0f14,
      roughness: 0.9,
      roughnessMap: this.fabricTex.roughnessMap,
      normalMap: this.fabricTex.normalMap,
      normalScale: new THREE.Vector2(1.45, 1.45),
      metalness: 0.03,
      sheen: 0.85,
      sheenRoughness: 0.62,
      sheenColor: new THREE.Color(0x6b1424),
    })

    this.hoodieInnerFleece = new THREE.MeshPhysicalMaterial({
      color: 0x050609,
      roughness: 0.96,
      normalMap: this.fabricTex.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      sheen: 0.45,
      sheenColor: new THREE.Color(0x7c1024),
    })

    this.backpackShellMat = new THREE.MeshPhysicalMaterial({
      color: 0x111218,
      roughness: 0.62,
      metalness: 0.16,
      normalMap: this.fabricTex.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      clearcoat: 0.12,
      clearcoatRoughness: 0.45,
    })

    // Completely dark velvety matte-obsidian faceless mask shell (no harsh glare dot)
    this.shadowMaskMat = new THREE.MeshPhysicalMaterial({
      color: 0x010103,
      roughness: 0.86,
      metalness: 0.04,
      clearcoat: 0.03,
      clearcoatRoughness: 0.75,
    })

    // Subtle contoured obsidian brow plate seam visible above eyes in reference image
    this.maskBrowMat = new THREE.MeshPhysicalMaterial({
      color: 0x030306,
      roughness: 0.72,
      metalness: 0.08,
      clearcoat: 0.06,
      clearcoatRoughness: 0.68,
    })

    this.darkMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0x191b22,
      roughness: 0.3,
      metalness: 0.88,
      clearcoat: 0.42,
      clearcoatRoughness: 0.24,
    })

    this.brightBuckleMat = new THREE.MeshPhysicalMaterial({
      color: 0x7a8394,
      roughness: 0.24,
      metalness: 0.94,
      clearcoat: 0.45,
      clearcoatRoughness: 0.2,
    })

    this.tacticalStrapMat = new THREE.MeshStandardMaterial({
      color: 0x13141b,
      roughness: 0.78,
      metalness: 0.12,
    })

    this.leatherCushion = new THREE.MeshPhysicalMaterial({
      color: 0x0b0c11,
      roughness: 0.44,
      metalness: 0.08,
      sheen: 0.35,
      sheenColor: new THREE.Color(0x3a121b),
    })

    this.redAccentFabricMat = new THREE.MeshStandardMaterial({
      color: 0xcc1430,
      emissive: 0x620514,
      emissiveIntensity: 0.42,
      roughness: 0.48,
      metalness: 0.18,
    })

    // Intense sharp crimson glowing red eyes + hot pinkish-white core
    this.crimsonEyeMat = new THREE.MeshStandardMaterial({
      color: 0xff1133,
      emissive: 0xf00525,
      emissiveIntensity: 2.9,
      roughness: 0.1,
      toneMapped: false,
    })

    this.crimsonEyeCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffccd6,
      toneMapped: false,
    })

    this.eyeHaloSpriteMat = new THREE.MeshBasicMaterial({
      map: this.eyeGlowTex,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })

    // Illuminated neon-red headphone rings
    this.crimsonRingMat = new THREE.MeshStandardMaterial({
      color: 0xff1638,
      emissive: 0xe60022,
      emissiveIntensity: 2.8,
      roughness: 0.12,
      toneMapped: false,
    })

    this.crimsonRingCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffb8c4,
      toneMapped: false,
    })

    // Vivid crimson embroidered red crown emblem on the black hood brow (stays rich red, never salmon)
    this.crownEmblemMat = new THREE.MeshStandardMaterial({
      color: 0xde0c26,
      emissive: 0xc2041c,
      emissiveIntensity: 1.05,
      roughness: 0.42,
      metalness: 0.04,
      toneMapped: false,
    })

    // Iconic glowing neon-red circular back-halo ring
    this.haloRingMat = new THREE.MeshBasicMaterial({
      color: 0xff1c3e,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    })

    this.haloCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffc8d2,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    })

    this.haloArcMat = new THREE.MeshBasicMaterial({
      color: 0xff5a75,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    })

    this.mistPlaneMat = new THREE.MeshBasicMaterial({
      map: this.mistGlowTex,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
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
    // Iconic glowing neon-red circular halo ring behind the head & shoulders (exact IMG_0544 motif)
    this.haloGroup.position.set(0, 1.32, -0.54)
    this.bodyRig.add(this.haloGroup)

    // Main luminous crimson ring
    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.06, 0.018, 12, 84),
      this.haloRingMat,
    )
    this.haloGroup.add(outerRing)

    // Hot white-pink inner filament core so the halo glows crisply even without post-processing
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.06, 0.006, 10, 84),
      this.haloCoreMat,
    )
    coreRing.position.z = 0.008
    this.haloGroup.add(coreRing)

    // Soft additive crimson aura halo ring
    const softAuraRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.19, 72),
      new THREE.MeshBasicMaterial({
        color: 0xff1638,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    this.haloGroup.add(softAuraRing)

    // Subtle atmospheric red volumetric glow behind head & shoulders
    const mistBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), this.mistPlaneMat)
    mistBackdrop.position.set(0, -0.1, -0.22)
    this.haloGroup.add(mistBackdrop)

    // Subtle radial tech ticks on the halo ring (matching reference aesthetic)
    const tickGeo = new THREE.BoxGeometry(0.012, 0.075, 0.008)
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4
      const tick = new THREE.Mesh(tickGeo, this.haloRingMat)
      tick.position.set(Math.cos(angle) * 1.06, Math.sin(angle) * 1.06, 0.005)
      tick.rotation.z = angle + Math.PI / 2
      this.haloGroup.add(tick)
    }

    // Smoothly rotating processing arc (accelerates subtly during AI thinking state)
    this.haloAccentArc = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.009, 10, 48, Math.PI * 0.45),
      this.haloArcMat,
    )
    this.haloGroup.add(this.haloAccentArc)
  }

  private buildTacticalHoodieTorso() {
    // Sleek athletic V-tapered tactical hoodie torso profile matching IMG_0544
    const profile = [
      new THREE.Vector2(0.01, -1.28),
      new THREE.Vector2(0.5, -1.24),
      new THREE.Vector2(0.54, -0.78),
      new THREE.Vector2(0.61, -0.18),
      new THREE.Vector2(0.73, 0.38),
      new THREE.Vector2(0.83, 0.72),
      new THREE.Vector2(0.68, 0.9),
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

      z *= 0.72
      x *= 1.0
      if (z > 0 && y > 0.02 && y < 0.76) {
        z += 0.058 * Math.cos(angle * 2) * Math.sin(((y - 0.02) / 0.74) * Math.PI)
      }

      const foldAmp = THREE.MathUtils.clamp((0.62 - y) * 0.022, 0.005, 0.028)
      const drapery =
        Math.sin(angle * 8 + y * 2.4) * foldAmp +
        Math.cos(angle * 14 - y * 3.0) * foldAmp * 0.42
      x += Math.sin(angle) * drapery
      z += Math.cos(angle) * drapery

      p.setXYZ(i, x, y, z)
    }
    torsoGeo.computeVertexNormals()

    const torsoMesh = new THREE.Mesh(torsoGeo, this.hoodieFabric)
    this.bodyRig.add(torsoMesh)

    // Heavy billowing layered cowl collar folds around neck & behind shoulders (signature IMG_0544 silhouette)
    const collarLayers = [
      { r: 0.46, tube: 0.13, y: 0.96, z: 0.03, rx: 1.72, sx: 1.15, sy: 0.98 },
      { r: 0.56, tube: 0.115, y: 0.86, z: 0.04, rx: 1.84, sx: 1.2, sy: 0.95 },
      { r: 0.64, tube: 0.09, y: 0.76, z: 0.03, rx: 1.92, sx: 1.18, sy: 0.92 },
    ]
    collarLayers.forEach((c, idx) => {
      const geo = new THREE.TorusGeometry(c.r, c.tube, 24, 56)
      const pos = geo.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i)
        const vy = pos.getY(i)
        const vz = pos.getZ(i)
        const wave = Math.sin(Math.atan2(vy, vx) * 5 + idx * 1.5) * 0.022
        pos.setXYZ(i, vx, vy + wave, vz + wave * 0.75)
      }
      geo.computeVertexNormals()
      const mesh = new THREE.Mesh(geo, idx === 0 ? this.hoodieInnerFleece : this.hoodieFabric)
      mesh.rotation.x = c.rx
      mesh.position.set(0, c.y, c.z)
      mesh.scale.set(c.sx, c.sy, 1.04)
      this.bodyRig.add(mesh)
    })

    // High-contrast metallic silver-gunmetal center front zipper
    const zipperCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.82, 0.49),
      new THREE.Vector3(0, 0.46, 0.595),
      new THREE.Vector3(0, 0.04, 0.565),
      new THREE.Vector3(0, -0.58, 0.49),
    ])
    const zipperTrack = new THREE.Mesh(
      new THREE.TubeGeometry(zipperCurve, 28, 0.015, 8, false),
      this.darkMetalMat,
    )
    this.bodyRig.add(zipperTrack)

    const toothGeo = new THREE.BoxGeometry(0.044, 0.011, 0.018)
    const teethMesh = new THREE.InstancedMesh(toothGeo, this.brightBuckleMat, 30)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 30; i++) {
      const t = i / 29
      const pt = zipperCurve.getPoint(t)
      dummy.position.set(pt.x, pt.y, pt.z + 0.012)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      teethMesh.setMatrixAt(i, dummy.matrix)
    }
    teethMesh.computeBoundingSphere()
    this.bodyRig.add(teethMesh)

    const zipperSlider = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.056, 0.034),
      this.brightBuckleMat,
    )
    zipperSlider.position.set(0, 0.71, 0.545)
    this.bodyRig.add(zipperSlider)

    const zipperPull = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.088, 0.012),
      this.brightBuckleMat,
    )
    zipperPull.position.set(0, 0.642, 0.568)
    zipperPull.rotation.x = -0.15
    this.bodyRig.add(zipperPull)

    // Crimson-red braided hood drawstrings with brushed metal grommets & dark metallic aglets
    ;[-0.13, 0.13].forEach((side, i) => {
      const eyelet = new THREE.Mesh(
        new THREE.TorusGeometry(0.022, 0.006, 8, 16),
        this.brightBuckleMat,
      )
      eyelet.position.set(side * 0.95, 0.85, 0.46)
      this.bodyRig.add(eyelet)

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.95, 0.85, 0.465),
        new THREE.Vector3(side * 1.15, 0.56, 0.59),
        new THREE.Vector3(side * 1.22, 0.25 - i * 0.03, 0.595),
      ])
      const cord = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.014, 10, false),
        this.redAccentFabricMat,
      )
      this.bodyRig.add(cord)

      const aglet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.072, 12),
        this.brightBuckleMat,
      )
      aglet.position.set(side * 1.22, 0.21 - i * 0.03, 0.595)
      this.bodyRig.add(aglet)
    })

    // Dual Tactical Backpack/Harness Shoulder Straps sitting flush over the shoulders & chest
    ;[-1, 1].forEach((side) => {
      const strapCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.44, 0.82, -0.44),
        new THREE.Vector3(side * 0.52, 0.91, 0.04),
        new THREE.Vector3(side * 0.45, 0.68, 0.46),
        new THREE.Vector3(side * 0.36, 0.36, 0.575),
        new THREE.Vector3(side * 0.33, -0.06, 0.535),
      ])
      const strapGeo = new THREE.TubeGeometry(strapCurve, 34, 0.048, 8, false)
      strapGeo.scale(1.0, 1.0, 0.4)
      const strapMesh = new THREE.Mesh(strapGeo, this.tacticalStrapMat)
      strapMesh.position.z = 0.04
      this.bodyRig.add(strapMesh)

      // Upper metallic rectangular collar D-ring/loop (visible at collar-shoulder junction in IMG_0544)
      const upperLoop = this.createMetallicBuckleFrame(0.095, 0.075, 0.016)
      upperLoop.position.set(side * 0.41, 0.93, 0.24)
      upperLoop.rotation.set(0.68, side * 0.35, -side * 0.2)
      this.bodyRig.add(upperLoop)

      // Red woven shoulder accent band on top of each harness strap
      const redTab = new THREE.Mesh(
        new THREE.BoxGeometry(0.108, 0.044, 0.038),
        this.redAccentFabricMat,
      )
      redTab.position.set(side * 0.48, 0.83, 0.38)
      redTab.rotation.set(0.55, side * 0.32, -side * 0.14)
      this.bodyRig.add(redTab)

      // Prominent brushed gunmetal rectangular adjuster buckle seated flush on front chest strap
      const chestBuckle = this.createMetallicBuckleFrame(0.132, 0.118, 0.022)
      chestBuckle.position.set(side * 0.38, 0.48, 0.585)
      chestBuckle.rotation.set(-0.14, side * 0.38, -side * 0.08)
      this.bodyRig.add(chestBuckle)
    })
  }

  private createMetallicBuckleFrame(width: number, height: number, thickness: number): THREE.Group {
    const group = new THREE.Group()
    const barThick = thickness * 0.82
    const topBar = new THREE.Mesh(
      new THREE.BoxGeometry(width, barThick, thickness),
      this.brightBuckleMat,
    )
    topBar.position.y = height / 2 - barThick / 2
    const botBar = topBar.clone()
    botBar.position.y = -(height / 2 - barThick / 2)

    const midBar = new THREE.Mesh(
      new THREE.BoxGeometry(width - barThick * 1.4, barThick * 0.8, thickness * 0.9),
      this.brightBuckleMat,
    )

    const leftSide = new THREE.Mesh(
      new THREE.BoxGeometry(barThick, height, thickness),
      this.brightBuckleMat,
    )
    leftSide.position.x = -(width / 2 - barThick / 2)
    const rightSide = leftSide.clone()
    rightSide.position.x = width / 2 - barThick / 2

    group.add(topBar, botBar, midBar, leftSide, rightSide)
    return group
  }

  private buildTacticalBackpack() {
    // Sculpted matte-black tactical backpack visible behind shoulders in 3/4 view (exact IMG_0544 feature)
    const pack = new THREE.Group()
    pack.position.set(0, 0.22, -0.66)
    this.bodyRig.add(pack)

    // Main structured pack body
    const mainBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 1.32, 0.44),
      this.backpackShellMat,
    )
    mainBody.position.set(0, 0.02, -0.05)
    pack.add(mainBody)

    // Rounded top tactical flap
    const topCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.24, 1.14, 16),
      this.backpackShellMat,
    )
    topCap.rotation.z = Math.PI / 2
    topCap.position.set(0, 0.66, -0.04)
    pack.add(topCap)

    // Side utility pouches (catch red rim lighting nicely in 3/4 view!)
    ;[-1, 1].forEach((side) => {
      const sidePocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.78, 0.32),
        this.backpackShellMat,
      )
      sidePocket.position.set(side * 0.64, -0.06, -0.02)
      pack.add(sidePocket)

      // Tactical compression strap + small red accent clip on backpack edge
      const clip = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.14, 0.08),
        this.darkMetalMat,
      )
      clip.position.set(side * 0.73, 0.16, 0.02)
      pack.add(clip)

      const redEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.24, 0.04),
        this.redAccentFabricMat,
      )
      redEdge.position.set(side * 0.72, -0.18, 0.04)
      pack.add(redEdge)
    })
  }

  private buildSculptedHoodAndObsidianMask() {
    this.headRig.position.set(0, 1.42, 0.03)
    this.bodyRig.add(this.headRig)

    // Oversized sculpted heavy black hood (deep overhanging brow + wide draped cheeks)
    const hoodGeo = new THREE.SphereGeometry(0.615, 64, 48)
    const pos = hoodGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i)
      let y = pos.getY(i)
      let z = pos.getZ(i)

      // Subtle peaked hood dome tapering gently at top-back
      if (y > 0.06) {
        const topT = (y - 0.06) / 0.555
        y += 0.19 * Math.pow(topT, 1.4)
        z -= 0.075 * topT
        x *= 1.0 - 0.1 * topT
      }

      // Deep dark face cavity framed by thick forward-overhanging hood opening
      if (z > 0.08) {
        const fT = (z - 0.08) / 0.535
        const faceEll = (x / 0.425) * (x / 0.425) + ((y - 0.0) / 0.475) * ((y - 0.0) / 0.475)
        if (faceEll < 1.0 && z > 0.15) {
          const depthT = Math.pow(1.0 - faceEll, 0.62)
          z = THREE.MathUtils.lerp(z + 0.14 * fT, -0.05, depthT)
          x *= 1.0 - 0.05 * depthT
        } else if (y > 0.02) {
          z += 0.25 * Math.pow(fT, 1.12)
          y += 0.035 * fT
          x *= 0.95
        } else {
          x *= 1.06 + 0.08 * fT
          z += 0.1 * fT
        }
      }

      // Billowing lower hood base blending into cowl collar
      if (y < -0.18) {
        const lowT = (-y - 0.18) / 0.435
        x *= 1.0 + 0.28 * lowT
        z *= 1.0 + 0.2 * lowT
      }

      // Natural heavy cotton drapery creases
      const fold = Math.sin(x * 10 + y * 5) * 0.015 + Math.cos(z * 9 - y * 6) * 0.012
      x += fold * (x >= 0 ? 1 : -1) * 0.65
      z += fold * 0.5

      pos.setXYZ(i, x, y, z)
    }
    hoodGeo.computeVertexNormals()
    const outerHood = new THREE.Mesh(hoodGeo, this.hoodieFabric)
    this.headRig.add(outerHood)

    // Bold Curved 3D Red Crown Emblem seated proudly on the front brow of the hood (exact IMG_0544 signature!)
    const hoodCrownGroup = new THREE.Group()
    hoodCrownGroup.position.set(0, 0.555, 0.635)
    hoodCrownGroup.rotation.set(-0.36, 0, 0)

    const crownMain = new THREE.Mesh(
      createCurvedHoodCrownGeometry(1.26, 0.022),
      this.crownEmblemMat,
    )
    const crownBaseGeo = new THREE.BoxGeometry(0.188, 0.024, 0.02, 8, 1, 1)
    const cbPos = crownBaseGeo.attributes.position
    for (let i = 0; i < cbPos.count; i++) {
      const bx = cbPos.getX(i)
      cbPos.setZ(i, cbPos.getZ(i) - bx * bx * 0.72)
    }
    crownBaseGeo.computeVertexNormals()
    const crownBaseBar = new THREE.Mesh(crownBaseGeo, this.crownEmblemMat)
    crownBaseBar.position.set(0, -0.098, 0.002)
    hoodCrownGroup.add(crownMain, crownBaseBar)
    this.headRig.add(hoodCrownGroup)

    // Thick rolled-over outer hood brim hem
    const hemCurvePts: THREE.Vector3[] = []
    for (let a = 0; a < 40; a++) {
      const theta = (a / 40) * Math.PI * 2
      const rx = Math.cos(theta) * 0.435
      const ry = Math.sin(theta) * 0.515 + 0.015
      const browPush = Math.max(0, Math.sin(theta)) * 0.195
      const rz = 0.375 + browPush + Math.sin(theta * 3) * 0.014
      hemCurvePts.push(new THREE.Vector3(rx, ry, rz))
    }
    const hemCurve = new THREE.CatmullRomCurve3(hemCurvePts, true)
    const hemGeo = new THREE.TubeGeometry(hemCurve, 76, 0.062, 16, true)
    const hemMesh = new THREE.Mesh(hemGeo, this.hoodieFabric)
    this.headRig.add(hemMesh)

    const innerLiner = new THREE.Mesh(
      new THREE.SphereGeometry(0.455, 36, 28),
      this.hoodieInnerFleece,
    )
    innerLiner.scale.set(0.9, 1.02, 0.78)
    this.headRig.add(innerLiner)

    // Completely dark, smooth faceless obsidian mask (zero mouth, zero nose)
    const obsidianMask = new THREE.Mesh(
      new THREE.SphereGeometry(0.365, 40, 32),
      this.shadowMaskMat,
    )
    obsidianMask.position.set(0, -0.025, 0.115)
    obsidianMask.scale.set(0.86, 1.05, 0.9)
    this.headRig.add(obsidianMask)

    // Subtle contoured V-shaped obsidian forehead/brow plate seam (tucked flush on upper mask)
    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.24, 0.21, 0.3),
      new THREE.Vector3(-0.09, 0.165, 0.4),
      new THREE.Vector3(0, 0.125, 0.422),
      new THREE.Vector3(0.09, 0.165, 0.4),
      new THREE.Vector3(0.24, 0.21, 0.3),
    ])
    const browSeam = new THREE.Mesh(
      new THREE.TubeGeometry(browCurve, 28, 0.007, 8, false),
      this.maskBrowMat,
    )
    this.headRig.add(browSeam)

    // Sharp fierce swept-upward angular glowing red eyes (outer crimson blade + hot inner core + additive halo)
    const buildEyeShape = (dir: -1 | 1, scale = 1) => {
      const s = scale
      const shape = new THREE.Shape()
      shape.moveTo(dir * 0.126 * s, 0.048 * s) // Outer sharp upper corner
      shape.quadraticCurveTo(dir * 0.02 * s, 0.062 * s, -dir * 0.104 * s, -0.034 * s) // Swept upper lid
      shape.quadraticCurveTo(dir * 0.008 * s, -0.048 * s, dir * 0.126 * s, 0.048 * s) // Fierce lower curve
      return shape
    }

    const buildEyeAssembly = (side: -1 | 1): THREE.Group => {
      const group = new THREE.Group()

      // Outer crimson emissive eye blade
      const outerGeo = new THREE.ExtrudeGeometry(buildEyeShape(side, 1.0), {
        depth: 0.016,
        bevelEnabled: true,
        bevelThickness: 0.004,
        bevelSize: 0.004,
        bevelSegments: 2,
      })
      outerGeo.center()
      const outerMesh = new THREE.Mesh(outerGeo, this.crimsonEyeMat)
      group.add(outerMesh)

      // Inner incandescent pinkish-white core blade (matches fiery glowing center of IMG_0544 eyes)
      const innerGeo = new THREE.ShapeGeometry(buildEyeShape(side, 0.6), 10)
      innerGeo.center()
      const innerMesh = new THREE.Mesh(innerGeo, this.crimsonEyeCoreMat)
      innerMesh.position.z = 0.014
      group.add(innerMesh)

      // Soft additive red radial glow sprite directly behind eye
      const haloPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.24), this.eyeHaloSpriteMat)
      haloPlane.position.z = -0.004
      haloPlane.rotation.z = side * 0.28
      group.add(haloPlane)

      group.position.set(side * 0.126, 0, -0.002)
      group.rotation.set(0.05, side * 0.26, side * 0.1)
      return group
    }

    this.eyesGroup = new THREE.Group()
    this.eyesGroup.position.set(0, 0.032, 0.445)
    this.headRig.add(this.eyesGroup)

    this.leftEyeAssembly = buildEyeAssembly(-1)
    this.rightEyeAssembly = buildEyeAssembly(1)
    this.eyesGroup.add(this.leftEyeAssembly, this.rightEyeAssembly)

    // Crimson eye glow cast softly onto inner hood brim without creating a bright hotspot on the mask
    this.eyeBounceLight = new THREE.PointLight(0xff1030, 1.15, 2.2, 2)
    this.eyeBounceLight.position.set(0, 0.04, 0.62)
    this.headRig.add(this.eyeBounceLight)
  }

  private buildOfficialHeadphones() {
    const hp = new THREE.Group()
    this.headRig.add(hp)

    // Wide, chunky matte-black studio over-ear headband arching over the oversized hood
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.685, 0.056, 18, 64, Math.PI * 1.06),
      this.darkMetalMat,
    )
    arch.position.set(0, 0.1, -0.01)
    arch.rotation.z = -0.03 * Math.PI
    arch.scale.set(1.04, 1.15, 1.56)
    hp.add(arch)

    // Soft black padded headband underside
    const innerPad = new THREE.Mesh(
      new THREE.TorusGeometry(0.638, 0.038, 14, 48, Math.PI * 0.86),
      this.leatherCushion,
    )
    innerPad.position.set(0, 0.1, -0.01)
    innerPad.rotation.z = 0.07 * Math.PI
    innerPad.scale.set(1.04, 1.15, 1.32)
    hp.add(innerPad)

    // Brushed gunmetal adjustment hinge blocks on the sides of the headband (matches IMG_0544)
    ;[-1, 1].forEach((side) => {
      const hingeBlock = new THREE.Mesh(
        new THREE.BoxGeometry(0.095, 0.14, 0.145),
        this.darkMetalMat,
      )
      hingeBlock.position.set(side * 0.675, 0.38, -0.01)
      hingeBlock.rotation.z = side * 0.34
      hp.add(hingeBlock)

      const sliderBand = new THREE.Mesh(
        new THREE.BoxGeometry(0.102, 0.026, 0.152),
        this.brightBuckleMat,
      )
      sliderBand.position.set(side * 0.685, 0.32, -0.01)
      sliderBand.rotation.z = side * 0.34
      hp.add(sliderBand)
    })

    const earCupFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.earCupCrownTex,
      emissive: 0x620616,
      emissiveMap: this.earCupCrownTex,
      emissiveIntensity: 1.05,
      roughness: 0.32,
      metalness: 0.42,
    })

    ;[-1, 1].forEach((side) => {
      const cup = new THREE.Group()
      // Ergonomic slight forward cant so illuminated red ring + crown emblem read clearly in 3/4 view!
      cup.position.set(side * 0.67, 0.04, 0.05)
      cup.rotation.set(0, -side * 0.2, side * 0.08)

      // Sturdy metallic ear-cup fork/yoke
      const yoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.044, 0.28, 0.082),
        this.darkMetalMat,
      )
      yoke.position.set(side * 0.048, 0.21, 0)
      cup.add(yoke)

      // Thick plush black leather ear cushion pressed cleanly against hood
      const cushion = new THREE.Mesh(
        new THREE.TorusGeometry(0.215, 0.086, 18, 40),
        this.leatherCushion,
      )
      cushion.rotation.y = Math.PI / 2
      cushion.position.x = -side * 0.018
      cup.add(cushion)

      // Large chunky beveled matte-black circular ear-cup shell
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.208, 0.248, 0.15, 40),
        this.darkMetalMat,
      )
      shell.rotation.z = Math.PI / 2
      shell.position.x = side * 0.078
      cup.add(shell)

      // Subtle dark metallic rim bevel
      const rimTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.016, 12, 44),
        this.brightBuckleMat,
      )
      rimTrim.rotation.y = Math.PI / 2
      rimTrim.position.x = side * 0.136
      cup.add(rimTrim)

      // Center face disc with official glowing red 3-point crown emblem
      const crownCap = new THREE.Mesh(new THREE.CircleGeometry(0.18, 40), earCupFaceMat)
      crownCap.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2
      crownCap.position.x = side * 0.156
      cup.add(crownCap)

      // Bright illuminated neon-red outer LED ring encircling the ear-cup crown
      const redRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.186, 0.018, 14, 48),
        this.crimsonRingMat,
      )
      redRing.rotation.y = Math.PI / 2
      redRing.position.x = side * 0.156
      cup.add(redRing)

      // Hot inner neon filament core for unmistakable illuminated ring glow
      const redRingCore = new THREE.Mesh(
        new THREE.TorusGeometry(0.186, 0.006, 10, 48),
        this.crimsonRingCoreMat,
      )
      redRingCore.rotation.y = Math.PI / 2
      redRingCore.position.x = side * 0.165
      cup.add(redRingCore)

      // Soft additive crimson glow disc on the ear cup face
      const cupGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56), this.eyeHaloSpriteMat)
      cupGlow.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2
      cupGlow.position.x = side * 0.168
      cup.add(cupGlow)

      hp.add(cup)
    })
  }

  private buildCrossedTacticalArms() {
    // Confident crossed-arms posture matching IMG_0544_1313509c.JPG:
    // - Anatomical RIGHT arm (-X, facing camera in 3/4 view): descends broadly with MR.ROBOT patch +
    //   2 crimson stripes facing the viewer, elbow bends forward, forearm crosses cleanly across chest toward +X!
    // - Anatomical LEFT arm (+X): descends along torso, forearm crosses across lower chest tucked neatly under/against right arm!
    this.bodyRig.add(this.crossedArmsRig)

    // Sculpted shoulder deltoid caps blending seamlessly into sleek hoodie torso
    ;[-1, 1].forEach((side) => {
      const shoulderCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 24, 20),
        this.hoodieFabric,
      )
      shoulderCap.position.set(side * 0.78, 0.6, 0.05)
      shoulderCap.scale.set(1.02, 1.12, 0.94)
      this.crossedArmsRig.add(shoulderCap)
    })

    // Anatomical RIGHT arm (-X -> across chest to +X) — front-most crossing forearm
    const rightArmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.8, 0.6, 0.05), // Right shoulder
      new THREE.Vector3(-0.88, 0.16, 0.24), // Right upper arm (MR.ROBOT patch zone!)
      new THREE.Vector3(-0.74, -0.24, 0.52), // Right elbow forward
      new THREE.Vector3(-0.2, -0.32, 0.76), // Crossing front of chest
      new THREE.Vector3(0.4, -0.17, 0.68), // Forearm approaching left bicep
      new THREE.Vector3(0.62, -0.11, 0.48), // Hand tucked neatly into left crook
    ])
    const rightSleeveGeo = createSculptedSleeveGeometry(
      rightArmCurve,
      44,
      24,
      (t) => {
        if (t < 0.35) return THREE.MathUtils.lerp(0.225, 0.198, t / 0.35)
        if (t < 0.8) return THREE.MathUtils.lerp(0.198, 0.16, (t - 0.35) / 0.45)
        return THREE.MathUtils.lerp(0.16, 0.122, (t - 0.8) / 0.2)
      },
      0.4,
    )
    const rightSleeveMesh = new THREE.Mesh(rightSleeveGeo, this.hoodieFabric)
    this.crossedArmsRig.add(rightSleeveMesh)

    // Anatomical LEFT arm (+X -> tucked crossing across chest toward -X)
    const leftArmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.8, 0.6, 0.04), // Left shoulder
      new THREE.Vector3(0.86, 0.14, 0.19), // Left upper arm
      new THREE.Vector3(0.75, -0.26, 0.45), // Left elbow
      new THREE.Vector3(0.18, -0.42, 0.63), // Crossing just below/behind right forearm
      new THREE.Vector3(-0.38, -0.25, 0.68), // Left wrist emerging near right bicep
      new THREE.Vector3(-0.6, -0.17, 0.53), // Left hand tucked against right arm
    ])
    const leftSleeveGeo = createSculptedSleeveGeometry(
      leftArmCurve,
      44,
      24,
      (t) => {
        if (t < 0.35) return THREE.MathUtils.lerp(0.225, 0.198, t / 0.35)
        if (t < 0.82) return THREE.MathUtils.lerp(0.198, 0.155, (t - 0.35) / 0.47)
        return THREE.MathUtils.lerp(0.155, 0.118, (t - 0.82) / 0.18)
      },
      2.1,
    )
    const leftSleeveMesh = new THREE.Mesh(leftSleeveGeo, this.hoodieFabric)
    this.crossedArmsRig.add(leftSleeveMesh)

    // Crimson cuff accents where the crossed wrists tuck in (matches red wrist detail in IMG_0544)
    const leftWristCuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.138, 0.012, 10, 28),
      this.redAccentFabricMat,
    )
    leftWristCuff.position.set(-0.42, -0.23, 0.68)
    leftWristCuff.rotation.set(0.3, 1.25, 0.2)
    this.crossedArmsRig.add(leftWristCuff)

    const rightWristCuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.138, 0.012, 10, 28),
      this.redAccentFabricMat,
    )
    rightWristCuff.position.set(0.42, -0.16, 0.67)
    rightWristCuff.rotation.set(0.2, -1.25, -0.18)
    this.crossedArmsRig.add(rightWristCuff)

    // Tucked matte-black gloved hands resting naturally in the crossed-arm fold
    const rightGlove = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 16, 14),
      this.leatherCushion,
    )
    rightGlove.position.set(0.62, -0.1, 0.48)
    rightGlove.scale.set(1.15, 0.82, 0.78)
    this.crossedArmsRig.add(rightGlove)

    const leftGlove = new THREE.Mesh(
      new THREE.SphereGeometry(0.104, 16, 14),
      this.leatherCushion,
    )
    leftGlove.position.set(-0.59, -0.16, 0.53)
    leftGlove.scale.set(1.12, 0.82, 0.78)
    this.crossedArmsRig.add(leftGlove)

    // Official MR.ROBOT tactical sleeve patch + 2 slanted red stripes wrapped snugly on the outer-front
    // of the right upper arm (-X), rotated directly toward the Hero 3/4 viewer for crisp legibility!
    const sleevePatchMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.sleevePatchTex,
      emissive: 0x45121a,
      emissiveMap: this.sleevePatchTex,
      emissiveIntensity: 0.48,
      transparent: true,
      roughness: 0.56,
      metalness: 0.06,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })

    // Curved open cylinder sleeve overlay hugging the right bicep (-X) facing front-outer camera
    const patchGeo = new THREE.CylinderGeometry(
      0.228,
      0.208,
      0.43,
      28,
      1,
      true,
      -Math.PI * 0.66,
      Math.PI * 0.72,
    )
    const rightPatchMesh = new THREE.Mesh(patchGeo, sleevePatchMat)
    rightPatchMesh.position.set(-0.86, 0.21, 0.22)
    rightPatchMesh.rotation.set(-0.28, 0.12, -0.1)
    this.crossedArmsRig.add(rightPatchMesh)

    // Matching subtle crimson accent stripe on the left upper sleeve (+X)
    const leftStripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.206, 0.011, 8, 28, Math.PI * 0.55),
      this.redAccentFabricMat,
    )
    leftStripe.position.set(0.85, 0.21, 0.17)
    leftStripe.rotation.set(Math.PI / 2 - 0.25, 0.1, -0.55)
    this.crossedArmsRig.add(leftStripe)
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
    this.eyePulseOverride = 5.2
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

    // Subtle organic chest breathing + restrained upper-body cadence
    const breath = Math.sin(elapsed * 1.55) * m * motion.breathScale
    const targetRig = usingCustom ? this.customModelSlot : this.bodyRig
    targetRig.position.y = breath * 0.032

    if (!usingCustom) {
      this.bodyRig.scale.set(1 + breath * 0.01, 1 + breath * 0.008, 1 + breath * 0.01)
      this.bodyRig.rotation.x = THREE.MathUtils.damp(
        this.bodyRig.rotation.x,
        motion.bodyPitchOffset,
        6,
        delta,
      )

      const gazeY =
        THREE.MathUtils.clamp(mouse.x * 0.3 + this.pose.lookBiasX, -0.48, 0.48) * m +
        motion.headYawOffset
      const gazeX =
        THREE.MathUtils.clamp(-mouse.y * 0.14, -0.18, 0.18) * m + motion.headPitchOffset

      this.headRig.rotation.y = THREE.MathUtils.damp(this.headRig.rotation.y, gazeY, 6, delta)
      this.headRig.rotation.x = THREE.MathUtils.damp(this.headRig.rotation.x, gazeX, 6, delta)
      this.headRig.rotation.z = THREE.MathUtils.damp(
        this.headRig.rotation.z,
        motion.headRollOffset,
        5,
        delta,
      )

      // Natural sharp-eye blinking (scales outer blade, hot core, and radial halo together)
      this.blinkTimer -= delta
      if (this.blinkTimer <= 0 && !this.isBlinking) {
        this.isBlinking = true
        this.blinkT = 0
        this.blinkTimer = 3.4 + Math.random() * 2.8
      }
      if (this.isBlinking) {
        this.blinkT += delta * 11.4
        if (this.blinkT >= Math.PI) {
          this.isBlinking = false
          this.blinkT = 0
        }
      }
      const eyeSY = evaluateBlinkEyeScale(this.blinkT, this.isBlinking)
      this.leftEyeAssembly.scale.y = eyeSY
      this.rightEyeAssembly.scale.y = eyeSY

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
      this.eyeHaloSpriteMat.opacity = THREE.MathUtils.clamp(
        0.72 * eyeSY * Math.min(1.4, motion.eyeGlowMultiplier),
        0.1,
        0.98,
      )
      this.crimsonRingMat.emissiveIntensity = THREE.MathUtils.damp(
        this.crimsonRingMat.emissiveIntensity,
        motion.ringGlowIntensity * 0.85,
        5,
        delta,
      )
      this.eyeBounceLight.intensity = 1.85 * eyeSY * motion.eyeGlowMultiplier

      // Back crimson halo breathing & neural thinking arc spin
      this.haloRingMat.opacity = THREE.MathUtils.damp(
        this.haloRingMat.opacity,
        THREE.MathUtils.clamp(0.76 * motion.haloIntensity, 0.55, 1.0),
        5,
        delta,
      )
      this.haloArcMat.opacity = THREE.MathUtils.damp(
        this.haloArcMat.opacity,
        THREE.MathUtils.clamp(0.62 * motion.haloIntensity, 0.35, 1.0),
        5,
        delta,
      )
      this.mistPlaneMat.opacity = THREE.MathUtils.damp(
        this.mistPlaneMat.opacity,
        THREE.MathUtils.clamp(0.55 * motion.haloIntensity, 0.38, 0.82),
        4,
        delta,
      )
      this.haloAccentArc.rotation.z += delta * motion.haloSpinSpeed

      // Subtle breathing heave & conversational posture shift on crossed arms (preserving silhouette)
      const dragTwist = THREE.MathUtils.clamp(productDragImpulse * 0.65, -0.08, 0.08)
      this.crossedArmsRig.position.y = THREE.MathUtils.damp(
        this.crossedArmsRig.position.y,
        breath * 0.018 - motion.armLiftOffset * 0.14,
        6,
        delta,
      )
      this.crossedArmsRig.rotation.x = THREE.MathUtils.damp(
        this.crossedArmsRig.rotation.x,
        motion.armLiftOffset * 0.32,
        6,
        delta,
      )
      this.crossedArmsRig.rotation.y = THREE.MathUtils.damp(
        this.crossedArmsRig.rotation.y,
        dragTwist + motion.headYawOffset * 0.14,
        5,
        delta,
      )
    }

    // Floating interactive Holo-Orb (used in select story chapters)
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
    this.eyeGlowTex.dispose()
    this.mistGlowTex.dispose()
  }
}
