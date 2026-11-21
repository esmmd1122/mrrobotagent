import * as THREE from 'three'
import type { CharacterPose } from '../keyframes'
import { createChestPrintTexture, createFabricNormalAndRoughness } from '../textures'
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
 * Exact 1:1 port of StudioMrRobotRig from the supplied HTML reference.
 * Preserves every sculpted vertex, fabric normal/roughness map, draped collar,
 * overhanging hood, thick hem, dark faceless interior, glowing red eyes with blink/gaze,
 * brushed studio headphones with crimson rings, articulated gloved arms, and holo-orb —
 * while cleanly supporting future official .glb/.gltf replacement via GltfCharacterAdapter.
 */
export class ProceduralMrRobotRig implements MrRobotCharacterController {
  readonly root = new THREE.Group()
  private readonly proceduralRoot = new THREE.Group()
  private readonly customModelSlot = new THREE.Group()
  private readonly bodyRig = new THREE.Group()
  private readonly headRig = new THREE.Group()
  private readonly gltfAdapter = new GltfCharacterAdapter()
  private readonly isSoftwareGl: boolean

  private customLabel = 'کاراکتر مرجع استودیویی MR.ROBOT'

  private fabricTex!: { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture }
  private chestPrintTex!: THREE.CanvasTexture

  private hoodieFabric!: THREE.MeshPhysicalMaterial
  private hoodieInnerFleece!: THREE.MeshPhysicalMaterial
  private shadowFaceMat!: THREE.MeshStandardMaterial
  private anodizedMetal!: THREE.MeshPhysicalMaterial
  private leatherCushion!: THREE.MeshPhysicalMaterial
  private crimsonNeon!: THREE.MeshStandardMaterial
  private steelCyanAccent!: THREE.MeshStandardMaterial

  private eyesGroup!: THREE.Group
  private leftEye!: THREE.Mesh
  private rightEye!: THREE.Mesh
  private eyeBounceLight!: THREE.PointLight

  private leftArm!: ArmRig
  private rightArm!: ArmRig

  private holoOrb!: THREE.Group
  private orbParts!: {
    glassCore: THREE.Mesh
    wireCore: THREE.Mesh
    orbitA: THREE.Mesh
    orbitB: THREE.Mesh
  }

  private blinkTimer = 3.1
  private isBlinking = false
  private blinkT = 0

  pose: CharacterPose = {
    lShX: 0.12,
    lShZ: 0.14,
    lElX: -0.42,
    rShX: -0.22,
    rShZ: -0.18,
    rElX: -0.62,
    orbScale: 0.001,
    orbPos: [0.85, 0.52, 0.72],
    eyeGlow: 3.4,
    lookBiasX: 0,
  }

  constructor(options?: { isSoftwareGl?: boolean }) {
    this.isSoftwareGl = Boolean(options?.isSoftwareGl)

    this.root.add(this.proceduralRoot)
    this.root.add(this.customModelSlot)
    this.proceduralRoot.add(this.bodyRig)

    this.fabricTex = createFabricNormalAndRoughness()
    this.buildMaterials()
    this.buildTailoredTorso()
    this.buildSculptedHoodAndHead()
    this.buildStudioHeadphones()
    this.buildArticulatedArms()
    this.buildInteractiveHoloOrb()
  }

  private buildMaterials() {
    this.hoodieFabric = new THREE.MeshPhysicalMaterial({
      color: 0x0b0f19,
      roughness: 0.88,
      roughnessMap: this.fabricTex.roughnessMap,
      normalMap: this.fabricTex.normalMap,
      normalScale: new THREE.Vector2(1.25, 1.25),
      metalness: 0.04,
      sheen: 0.85,
      sheenRoughness: 0.56,
      sheenColor: new THREE.Color(0x3b67b5),
    })

    this.hoodieInnerFleece = new THREE.MeshPhysicalMaterial({
      color: 0x05070e,
      roughness: 0.96,
      normalMap: this.fabricTex.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      sheen: 0.35,
      sheenColor: new THREE.Color(0x4a1220),
    })

    this.shadowFaceMat = new THREE.MeshStandardMaterial({
      color: 0x020307,
      roughness: 0.95,
      metalness: 0.05,
    })

    this.anodizedMetal = new THREE.MeshPhysicalMaterial({
      color: 0x1e293d,
      roughness: 0.24,
      metalness: 0.92,
      clearcoat: 0.45,
      clearcoatRoughness: 0.22,
    })

    this.leatherCushion = new THREE.MeshPhysicalMaterial({
      color: 0x0b0e14,
      roughness: 0.52,
      metalness: 0.08,
      sheen: 0.35,
      sheenColor: new THREE.Color(0x283856),
    })

    this.crimsonNeon = new THREE.MeshStandardMaterial({
      color: 0xff2a4e,
      emissive: 0xff163d,
      emissiveIntensity: 3.6,
      roughness: 0.12,
      toneMapped: false,
    })

    this.steelCyanAccent = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      toneMapped: false,
    })
  }

  private buildTailoredTorso() {
    const profile = [
      new THREE.Vector2(0.01, -1.32),
      new THREE.Vector2(0.55, -1.28),
      new THREE.Vector2(0.57, -0.82),
      new THREE.Vector2(0.62, -0.22),
      new THREE.Vector2(0.74, 0.36),
      new THREE.Vector2(0.86, 0.72),
      new THREE.Vector2(0.7, 0.91),
      new THREE.Vector2(0.38, 0.98),
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
      x *= 1.08
      if (z > 0 && y > 0.05 && y < 0.75) {
        z += 0.065 * Math.cos(angle * 2) * Math.sin(((y - 0.05) / 0.7) * Math.PI)
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

    const collarLayers = [
      { r: 0.44, tube: 0.115, y: 0.94, z: 0.05, rx: 1.72, sx: 1.12, sy: 0.96 },
      { r: 0.52, tube: 0.095, y: 0.84, z: 0.07, rx: 1.84, sx: 1.16, sy: 0.92 },
      { r: 0.58, tube: 0.072, y: 0.75, z: 0.08, rx: 1.92, sx: 1.12, sy: 0.88 },
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

    const printGeo = new THREE.CylinderGeometry(0.66, 0.61, 0.96, 36, 1, true, -0.52, 1.04)
    printGeo.scale(1.09, 1.0, 0.81)
    this.chestPrintTex = createChestPrintTexture()
    const printMat = new THREE.MeshStandardMaterial({
      map: this.chestPrintTex,
      transparent: true,
      roughness: 0.48,
      metalness: 0.12,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
    const chestPrint = new THREE.Mesh(printGeo, printMat)
    chestPrint.position.set(0, 0.31, 0.11)
    this.bodyRig.add(chestPrint)

    ;[-0.145, 0.145].forEach((side, i) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.92, 0.9, 0.42),
        new THREE.Vector3(side * 1.15, 0.62, 0.56),
        new THREE.Vector3(side * 1.08, 0.28 - i * 0.05, 0.55),
      ])
      const cord = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.013, 10, false),
        this.hoodieInnerFleece,
      )
      this.bodyRig.add(cord)

      const aglet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.017, 0.017, 0.068, 12),
        this.anodizedMetal,
      )
      aglet.position.set(side * 1.08, 0.25 - i * 0.05, 0.55)
      this.bodyRig.add(aglet)

      const agletTip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.016, 12),
        this.crimsonNeon,
      )
      agletTip.position.set(side * 1.08, 0.22 - i * 0.05, 0.55)
      this.bodyRig.add(agletTip)
    })
  }

  private buildSculptedHoodAndHead() {
    this.headRig.position.set(0, 1.4, 0.02)
    this.bodyRig.add(this.headRig)

    const hoodGeo = new THREE.SphereGeometry(0.58, 64, 48)
    const pos = hoodGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i)
      let y = pos.getY(i)
      let z = pos.getZ(i)

      if (y > 0.08) {
        const topT = (y - 0.08) / 0.5
        y += 0.16 * Math.pow(topT, 1.5)
        z -= 0.1 * topT
        x *= 1.0 - 0.08 * topT
      }

      if (z > 0.1) {
        const fT = (z - 0.1) / 0.48
        const faceEll = (x / 0.40) * (x / 0.40) + ((y - 0.01) / 0.45) * ((y - 0.01) / 0.45)
        if (faceEll < 1.0 && z > 0.16) {
          // Deeply recess the front face opening into the dark shadowed hood void
          // framed by the thick turned-in fabric hem, exposing the dark head & glowing red eyes
          const depthT = Math.pow(1.0 - faceEll, 0.65)
          z = THREE.MathUtils.lerp(z + 0.12 * fT, -0.04, depthT)
          x *= 1.0 - 0.06 * depthT
        } else if (y > 0.04) {
          z += 0.21 * Math.pow(fT, 1.15)
          y += 0.03 * fT
          x *= 0.94
        } else {
          x *= 1.04 + 0.08 * fT
          z += 0.08 * fT
        }
      }

      if (y < -0.2) {
        const lowT = (-y - 0.2) / 0.38
        x *= 1.0 + 0.26 * lowT
        z *= 1.0 + 0.18 * lowT
      }

      const fold = Math.sin(x * 11 + y * 5) * 0.015 + Math.cos(z * 10 - y * 6) * 0.012
      x += fold * (x >= 0 ? 1 : -1) * 0.65
      z += fold * 0.5

      pos.setXYZ(i, x, y, z)
    }
    hoodGeo.computeVertexNormals()
    const outerHood = new THREE.Mesh(hoodGeo, this.hoodieFabric)
    this.headRig.add(outerHood)

    const hemCurvePts: THREE.Vector3[] = []
    for (let a = 0; a < 36; a++) {
      const theta = (a / 36) * Math.PI * 2
      const rx = Math.cos(theta) * 0.41
      const ry = Math.sin(theta) * 0.49 + 0.02
      const browPush = Math.max(0, Math.sin(theta)) * 0.15
      const rz = 0.34 + browPush + Math.sin(theta * 3) * 0.015
      hemCurvePts.push(new THREE.Vector3(rx, ry, rz))
    }
    const hemCurve = new THREE.CatmullRomCurve3(hemCurvePts, true)
    const hemGeo = new THREE.TubeGeometry(hemCurve, 72, 0.056, 16, true)
    const hemMesh = new THREE.Mesh(hemGeo, this.hoodieFabric)
    this.headRig.add(hemMesh)

    const innerLiner = new THREE.Mesh(
      new THREE.SphereGeometry(0.43, 36, 28),
      this.hoodieInnerFleece,
    )
    innerLiner.position.set(0, 0.0, 0.0)
    innerLiner.scale.set(0.9, 1.02, 0.78)
    this.headRig.add(innerLiner)

    const innerHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 32, 24),
      this.shadowFaceMat,
    )
    innerHead.position.set(0, -0.02, 0.09)
    innerHead.scale.set(0.86, 1.04, 0.88)
    this.headRig.add(innerHead)

    const eyeShape = new THREE.Shape()
    eyeShape.moveTo(-0.092, -0.004)
    eyeShape.quadraticCurveTo(-0.01, 0.044, 0.092, 0.012)
    eyeShape.quadraticCurveTo(0.01, -0.024, -0.092, -0.004)

    const eyeGeo = new THREE.ExtrudeGeometry(eyeShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
    })

    this.eyesGroup = new THREE.Group()
    this.eyesGroup.position.set(0, 0.03, 0.43)
    this.headRig.add(this.eyesGroup)

    this.leftEye = new THREE.Mesh(eyeGeo, this.crimsonNeon)
    this.leftEye.position.set(-0.138, 0, 0)
    this.leftEye.rotation.set(0, -0.22, -0.13)

    this.rightEye = new THREE.Mesh(eyeGeo, this.crimsonNeon)
    this.rightEye.position.set(0.138, 0, 0)
    this.rightEye.rotation.set(0, 0.22, 0.13)

    this.eyesGroup.add(this.leftEye, this.rightEye)

    this.eyeBounceLight = new THREE.PointLight(0xff1e42, 2.8, 2.4, 2)
    this.eyeBounceLight.position.set(0, 0.03, 0.54)
    this.headRig.add(this.eyeBounceLight)
  }

  private buildStudioHeadphones() {
    const hp = new THREE.Group()
    this.headRig.add(hp)

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.64, 0.044, 18, 60, Math.PI * 1.06),
      this.anodizedMetal,
    )
    arch.position.set(0, 0.08, -0.02)
    arch.rotation.z = -0.03 * Math.PI
    arch.scale.set(1.02, 1.12, 1.38)
    hp.add(arch)

    const innerPad = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.032, 14, 48, Math.PI * 0.84),
      this.leatherCushion,
    )
    innerPad.position.set(0, 0.08, -0.02)
    innerPad.rotation.z = 0.08 * Math.PI
    innerPad.scale.set(1.02, 1.12, 1.2)
    hp.add(innerPad)

    const topLine = new THREE.Mesh(
      new THREE.TorusGeometry(0.682, 0.008, 8, 44, Math.PI * 0.56),
      this.crimsonNeon,
    )
    topLine.position.set(0, 0.085, -0.02)
    topLine.rotation.z = 0.22 * Math.PI
    topLine.scale.set(1.02, 1.12, 1.0)
    hp.add(topLine)

    ;[-1, 1].forEach((side) => {
      const cup = new THREE.Group()
      cup.position.set(side * 0.64, -0.02, 0.0)
      cup.rotation.z = side * 0.07

      const yoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.24, 12),
        this.anodizedMetal,
      )
      yoke.position.set(side * 0.04, 0.18, 0)
      cup.add(yoke)

      const cushion = new THREE.Mesh(
        new THREE.TorusGeometry(0.165, 0.068, 18, 36),
        this.leatherCushion,
      )
      cushion.rotation.y = Math.PI / 2
      cushion.position.x = -side * 0.02
      cup.add(cushion)

      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.195, 0.11, 32),
        this.anodizedMetal,
      )
      shell.rotation.z = Math.PI / 2
      shell.position.x = side * 0.065
      cup.add(shell)

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.125, 0.132, 0.03, 32),
        this.hoodieInnerFleece,
      )
      cap.rotation.z = Math.PI / 2
      cap.position.x = side * 0.122
      cup.add(cap)

      const redRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.145, 0.011, 12, 40),
        this.crimsonNeon,
      )
      redRing.rotation.y = Math.PI / 2
      redRing.position.x = side * 0.125
      cup.add(redRing)

      hp.add(cup)
    })
  }

  private buildArticulatedArms() {
    const buildArm = (side: -1 | 1): ArmRig => {
      const shoulder = new THREE.Group()
      shoulder.position.set(side * 0.86, 0.69, 0.02)

      const shoulderCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 24, 20),
        this.hoodieFabric,
      )
      shoulderCap.scale.set(0.95, 1.08, 0.92)
      shoulder.add(shoulderCap)

      const upper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.185, 0.15, 0.72, 24),
        this.hoodieFabric,
      )
      upper.position.y = -0.35
      shoulder.add(upper)

      const elbow = new THREE.Group()
      elbow.position.set(0, -0.7, 0)
      shoulder.add(elbow)

      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.112, 0.62, 24),
        this.hoodieFabric,
      )
      forearm.position.y = -0.3
      elbow.add(forearm)

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.112, 0.098, 0.09, 24),
        this.hoodieInnerFleece,
      )
      cuff.position.y = -0.6
      elbow.add(cuff)

      const cuffLine = new THREE.Mesh(
        new THREE.TorusGeometry(0.106, 0.006, 10, 28),
        this.steelCyanAccent,
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
        this.anodizedMetal,
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
      this.crimsonNeon,
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

  async loadOfficialModel(
    urlOrBlobUrl: string,
    label = 'مدل رسمی MR.ROBOT (.glb)',
  ): Promise<CharacterAssetMetadata> {
    await this.gltfAdapter.load(urlOrBlobUrl, this.customModelSlot)
    this.proceduralRoot.visible = false
    this.customLabel = label
    return this.getAssetMetadata()
  }

  playAnimationClip(clipName: string): boolean {
    return this.gltfAdapter.playClip(clipName)
  }

  resetToReferenceRig(): CharacterAssetMetadata {
    this.gltfAdapter.clear(this.customModelSlot)
    this.proceduralRoot.visible = true
    this.customLabel = 'کاراکتر مرجع استودیویی MR.ROBOT'
    return this.getAssetMetadata()
  }

  setEyePulseBoost(intensity: number) {
    this.crimsonNeon.emissiveIntensity = intensity
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

    if (usingCustom) {
      this.gltfAdapter.update(delta, mouse, this.pose.lookBiasX, reducedMotion)
    }

    const breath = Math.sin(elapsed * 1.65) * m
    const targetRig = usingCustom ? this.customModelSlot : this.bodyRig
    targetRig.position.y = breath * 0.038

    if (!usingCustom) {
      this.bodyRig.scale.set(1 + breath * 0.011, 1 + breath * 0.008, 1 + breath * 0.011)

      const gazeY = THREE.MathUtils.clamp(mouse.x * 0.36 + this.pose.lookBiasX, -0.55, 0.55) * m
      const gazeX = THREE.MathUtils.clamp(-mouse.y * 0.18, -0.22, 0.22) * m
      this.headRig.rotation.y = THREE.MathUtils.lerp(this.headRig.rotation.y, gazeY, 0.06)
      this.headRig.rotation.x = THREE.MathUtils.lerp(this.headRig.rotation.x, gazeX, 0.06)
      this.headRig.rotation.z = Math.sin(elapsed * 0.72) * 0.025 * m

      this.blinkTimer -= delta
      if (this.blinkTimer <= 0 && !this.isBlinking) {
        this.isBlinking = true
        this.blinkT = 0
        this.blinkTimer = 3.4 + Math.random() * 2.6
      }
      let eyeSY = 1.0
      if (this.isBlinking) {
        this.blinkT += delta * 10.5
        if (this.blinkT >= Math.PI) {
          this.isBlinking = false
        } else {
          eyeSY = Math.max(0.06, 1.0 - Math.sin(this.blinkT))
        }
      }
      this.leftEye.scale.y = eyeSY
      this.rightEye.scale.y = eyeSY

      const eyePulse = 1 + Math.sin(elapsed * 2.8) * 0.1 * m
      this.crimsonNeon.emissiveIntensity = THREE.MathUtils.lerp(
        this.crimsonNeon.emissiveIntensity,
        this.pose.eyeGlow * eyePulse,
        0.06,
      )
      this.eyeBounceLight.intensity = 2.2 * eyeSY * eyePulse

      const wave = Math.sin(elapsed * 1.25) * 0.045 * m
      const dragGesture = THREE.MathUtils.clamp(productDragImpulse * 2.8, -0.35, 0.35)

      this.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
        this.leftArm.shoulder.rotation.x,
        this.pose.lShX + wave - dragGesture * 0.4,
        0.06,
      )
      this.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(
        this.leftArm.shoulder.rotation.z,
        this.pose.lShZ,
        0.06,
      )
      this.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(
        this.leftArm.elbow.rotation.x,
        this.pose.lElX - wave * 0.6,
        0.06,
      )

      this.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
        this.rightArm.shoulder.rotation.x,
        this.pose.rShX - wave,
        0.06,
      )
      this.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
        this.rightArm.shoulder.rotation.z,
        this.pose.rShZ,
        0.06,
      )
      this.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
        this.rightArm.elbow.rotation.x,
        this.pose.rElX + wave * 0.7,
        0.06,
      )
    }

    const oScale = THREE.MathUtils.lerp(this.holoOrb.scale.x, this.pose.orbScale, 0.065)
    this.holoOrb.scale.setScalar(Math.max(0.001, oScale))
    this.holoOrb.visible = oScale > 0.015
    this.holoOrb.position.x = THREE.MathUtils.lerp(this.holoOrb.position.x, this.pose.orbPos[0], 0.06)
    this.holoOrb.position.y = THREE.MathUtils.lerp(
      this.holoOrb.position.y,
      this.pose.orbPos[1] + Math.sin(elapsed * 2.0) * 0.06 * m,
      0.06,
    )
    this.holoOrb.position.z = THREE.MathUtils.lerp(this.holoOrb.position.z, this.pose.orbPos[2], 0.06)

    this.orbParts.glassCore.rotation.y += delta * 0.55 * m
    this.orbParts.wireCore.rotation.x -= delta * 0.42 * m
    this.orbParts.orbitA.rotation.z += delta * 0.9 * m
    this.orbParts.orbitB.rotation.x -= delta * 0.65 * m
  }

  dispose() {
    this.gltfAdapter.clear(this.customModelSlot)
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    this.proceduralRoot.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      geometries.add(mesh.geometry)
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => materials.add(m))
      } else if (mesh.material) {
        materials.add(mesh.material)
      }
    })
    this.holoOrb.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      geometries.add(mesh.geometry)
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => materials.add(m))
      } else if (mesh.material) {
        materials.add(mesh.material)
      }
    })
    geometries.forEach((g) => g.dispose())
    materials.forEach((m) => m.dispose())
    this.fabricTex.normalMap.dispose()
    this.fabricTex.roughnessMap.dispose()
    this.chestPrintTex.dispose()
  }
}
