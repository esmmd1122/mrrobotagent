import * as THREE from 'three'
import { createStudioFloorTextures } from './textures'

export type CinemaEnvironmentRig = {
  envGroup: THREE.Group
  monolithGroup: THREE.Group
  horizonHalo: THREE.Mesh
  fgGroup: THREE.Group
  dust: THREE.Points
  slitRedMat: THREE.MeshStandardMaterial
  dispose: () => void
}

export function buildCinemaEnvironment(
  scene: THREE.Scene,
  options: { isMobile: boolean; isSoftwareGl: boolean },
): CinemaEnvironmentRig {
  const envGroup = new THREE.Group()
  scene.add(envGroup)

  const floorTex = createStudioFloorTextures()
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 42),
    new THREE.MeshPhysicalMaterial({
      map: floorTex,
      color: 0x0a1326,
      roughness: 0.34,
      metalness: 0.62,
      clearcoat: 0.35,
      clearcoatRoughness: 0.38,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.42
  envGroup.add(floor)

  const monolithMat = new THREE.MeshPhysicalMaterial({
    color: 0x070d1c,
    roughness: 0.42,
    metalness: 0.72,
    clearcoat: 0.2,
  })
  const slitBlueMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x2563eb,
    emissiveIntensity: 1.75,
    toneMapped: false,
  })
  const slitRedMat = new THREE.MeshStandardMaterial({
    color: 0xff2a4e,
    emissive: 0xef1d42,
    emissiveIntensity: 2.2,
    toneMapped: false,
  })

  const monolithGroup = new THREE.Group()
  const pillarBodyGeo = new THREE.BoxGeometry(1.15, 9.2, 0.75)
  const slitGeo = new THREE.BoxGeometry(0.028, 7.6, 0.04)

  const pillarCount = 8
  for (let i = 0; i < pillarCount; i++) {
    const t = i / (pillarCount - 1) - 0.5
    const angle = t * Math.PI * 0.82
    const radius = 8.4 + Math.abs(t) * 2.2
    const px = Math.sin(angle) * radius
    const pz = -Math.cos(angle) * radius - 1.5

    const pillar = new THREE.Group()
    pillar.position.set(px, 2.8, pz)
    pillar.lookAt(0, 2.8, 2)

    const body = new THREE.Mesh(pillarBodyGeo, monolithMat)
    pillar.add(body)

    const isCenterPair = i === 3 || i === 4
    const slit = new THREE.Mesh(slitGeo, isCenterPair ? slitRedMat : slitBlueMat)
    slit.position.z = 0.385
    pillar.add(slit)

    monolithGroup.add(pillar)
  }
  envGroup.add(monolithGroup)

  const horizonHalo = new THREE.Mesh(
    new THREE.TorusGeometry(6.8, 0.018, 12, 120),
    new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      emissive: 0x1d4ed8,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.55,
    }),
  )
  horizonHalo.position.set(0, 1.8, -7.8)
  envGroup.add(horizonHalo)

  const fgGroup = new THREE.Group()
  const fgGlassMat = options.isSoftwareGl
    ? new THREE.MeshStandardMaterial({
        color: 0x0a1733,
        roughness: 0.2,
        metalness: 0.35,
        transparent: true,
        opacity: 0.32,
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0x0a1733,
        roughness: 0.14,
        metalness: 0.25,
        transmission: 0.55,
        transparent: true,
        opacity: 0.36,
      })

  const finGeo = new THREE.BoxGeometry(0.06, 5.2, 1.4)
  const finLeft = new THREE.Mesh(finGeo, fgGlassMat)
  finLeft.position.set(-4.6, 1.2, 3.2)
  finLeft.rotation.y = 0.42
  const finRight = new THREE.Mesh(finGeo, fgGlassMat)
  finRight.position.set(4.6, 1.2, 3.2)
  finRight.rotation.y = -0.42
  fgGroup.add(finLeft, finRight)
  envGroup.add(fgGroup)

  const dustCount = options.isSoftwareGl ? 90 : options.isMobile ? 120 : 340
  const dPos = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 18
    dPos[i * 3 + 1] = (Math.random() - 0.2) * 9
    dPos[i * 3 + 2] = (Math.random() - 0.5) * 14
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3))
  const dustMat = new THREE.PointsMaterial({
    color: 0x93c5fd,
    size: 0.032,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  envGroup.add(dust)

  const dispose = () => {
    const geos = new Set<THREE.BufferGeometry>()
    const mats = new Set<THREE.Material>()
    envGroup.traverse((child) => {
      const m = child as THREE.Mesh | THREE.Points
      if ('geometry' in m && m.geometry) geos.add(m.geometry)
      if ('material' in m && m.material) {
        if (Array.isArray(m.material)) m.material.forEach((mm) => mats.add(mm))
        else mats.add(m.material)
      }
    })
    geos.forEach((g) => g.dispose())
    mats.forEach((m) => m.dispose())
    floorTex.dispose()
    scene.remove(envGroup)
  }

  return { envGroup, monolithGroup, horizonHalo, fgGroup, dust, slitRedMat, dispose }
}
