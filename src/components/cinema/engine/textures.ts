import * as THREE from 'three'

export function createFabricNormalAndRoughness(): {
  normalMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
} {
  const size = 512
  const heightData = new Float32Array(size * size)

  // Combine realistic cotton-fleece micro-weave + organic hoodie drapery fold waves
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size

      const weaveX = Math.sin(x * 1.35) * 0.5 + 0.5
      const weaveY = Math.cos(y * 1.35 + (x % 2) * 1.2) * 0.5 + 0.5
      const micro = weaveX * weaveY * 0.16

      const fold1 = Math.sin(u * Math.PI * 10 + Math.sin(v * Math.PI * 4) * 0.85) * 0.42
      const fold2 = Math.sin(u * Math.PI * 18 - v * Math.PI * 6) * 0.22
      const fold3 = Math.cos((u * 0.7 + v * 0.3) * Math.PI * 8) * 0.2

      heightData[y * size + x] = 0.5 + micro + (fold1 + fold2 + fold3) * 0.38
    }
  }

  const nCanvas = document.createElement('canvas')
  nCanvas.width = size
  nCanvas.height = size
  const nCtx = nCanvas.getContext('2d')!
  const nImg = nCtx.createImageData(size, size)

  const rCanvas = document.createElement('canvas')
  rCanvas.width = size
  rCanvas.height = size
  const rCtx = rCanvas.getContext('2d')!
  const rImg = rCtx.createImageData(size, size)

  const strength = 3.2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = (x - 1 + size) % size
      const xr = (x + 1) % size
      const yu = (y - 1 + size) % size
      const yd = (y + 1) % size

      const dx = (heightData[y * size + xr] - heightData[y * size + xl]) * strength
      const dy = (heightData[yd * size + x] - heightData[yu * size + x]) * strength
      const dz = 1.0
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz)

      const idx = (y * size + x) * 4
      nImg.data[idx] = Math.floor(((-dx / len) * 0.5 + 0.5) * 255)
      nImg.data[idx + 1] = Math.floor(((-dy / len) * 0.5 + 0.5) * 255)
      nImg.data[idx + 2] = Math.floor(((dz / len) * 0.5 + 0.5) * 255)
      nImg.data[idx + 3] = 255

      const h = THREE.MathUtils.clamp(heightData[y * size + x], 0, 1)
      const roughVal = Math.floor((0.93 - h * 0.18) * 255)
      rImg.data[idx] = rImg.data[idx + 1] = rImg.data[idx + 2] = roughVal
      rImg.data[idx + 3] = 255
    }
  }
  nCtx.putImageData(nImg, 0, 0)
  rCtx.putImageData(rImg, 0, 0)

  const normalMap = new THREE.CanvasTexture(nCanvas)
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
  normalMap.repeat.set(2.4, 2.4)

  const roughnessMap = new THREE.CanvasTexture(rCanvas)
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.repeat.set(2.4, 2.4)

  return { normalMap, roughnessMap }
}

export function createChestPrintTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 1024, 512)

  ctx.strokeStyle = 'rgba(239, 29, 66, 0.72)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(210, 185)
  ctx.lineTo(814, 185)
  ctx.moveTo(290, 342)
  ctx.lineTo(734, 342)
  ctx.stroke()

  ctx.font = '700 96px "Space Grotesk", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#edf3ff'
  ctx.fillText('MR.', 352, 265)
  ctx.fillStyle = '#ef1d42'
  ctx.fillText('ROBOT', 610, 265)

  ctx.font = '500 22px "JetBrains Mono", monospace'
  ctx.fillStyle = 'rgba(147, 197, 253, 0.78)'
  ctx.fillText('DIGITAL // AI // SYSTEMS', 512, 384)

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createStudioFloorTextures(): THREE.CanvasTexture {
  const size = 1024
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!

  ctx.fillStyle = '#040915'
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = 'rgba(110, 165, 255, 0.14)'
  ctx.lineWidth = 2
  ;[120, 220, 340, 460].forEach((r) => {
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2)
    ctx.stroke()
  })

  ctx.strokeStyle = 'rgba(110, 165, 255, 0.08)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(size / 2, 40)
  ctx.lineTo(size / 2, size - 40)
  ctx.moveTo(40, size / 2)
  ctx.lineTo(size - 40, size / 2)
  ctx.stroke()

  const fade = ctx.createRadialGradient(size / 2, size / 2, 110, size / 2, size / 2, size / 2)
  fade.addColorStop(0, 'rgba(4,9,21,0)')
  fade.addColorStop(0.76, 'rgba(3,7,18,0.55)')
  fade.addColorStop(1, 'rgba(2,5,13,1)')
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, size, size)

  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  return map
}

export function createPhoneOledTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 1024
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 512, 1024)
  g.addColorStop(0, '#07142e')
  g.addColorStop(0.5, '#0e2452')
  g.addColorStop(1, '#040a18')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 1024)

  ctx.fillStyle = '#010308'
  ctx.beginPath()
  ctx.roundRect(176, 36, 160, 42, 21)
  ctx.fill()

  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(256, 340, 106, -Math.PI / 2, Math.PI * 1.15)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(239, 29, 66, 0.85)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(256, 340, 82, 0.2, Math.PI * 1.4)
  ctx.stroke()

  ctx.fillStyle = '#f4f7fd'
  ctx.font = '700 42px "Space Grotesk", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('MR.ROBOT', 256, 540)

  ctx.fillStyle = '#93c5fd'
  ctx.font = '500 24px "JetBrains Mono", monospace'
  ctx.fillText('APPLE & MOBILE LAB', 256, 594)

  ctx.fillStyle = 'rgba(37, 99, 235, 0.85)'
  ctx.beginPath()
  ctx.roundRect(96, 760, 320, 84, 22)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 28px "Space Grotesk", sans-serif'
  ctx.fillText('DIAGNOSTICS READY', 256, 812)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export function createStudioEnvironmentMap(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  envScene.background = new THREE.Color(0x030712)

  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []

  const addSoftbox = (
    w: number,
    h: number,
    color: number,
    intensity: number,
    pos: [number, number, number],
    look: [number, number, number],
  ) => {
    const geo = new THREE.PlaneGeometry(w, h)
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    })
    geometries.push(geo)
    materials.push(mat)
    const m = new THREE.Mesh(geo, mat)
    m.position.set(pos[0], pos[1], pos[2])
    m.lookAt(look[0], look[1], look[2])
    envScene.add(m)
  }

  // Overhead cool-steel key softbox
  addSoftbox(10, 4, 0x9ec5ff, 2.8, [0, 8, 3], [0, 0, 0])
  // Left-back crisp cyan rim strip
  addSoftbox(3.5, 11, 0x38bdf8, 4.2, [-8, 3, -4], [0, 1, 0])
  // Right-back subtle violet-indigo fill strip
  addSoftbox(4, 10, 0x6366f1, 2.4, [8, 2.5, -3], [0, 1, 0])
  // Subtle crimson studio accent strip low-right
  addSoftbox(2.2, 6, 0xef1d42, 2.2, [6, 0.5, 4], [0, 1, 0])

  const rt = pmrem.fromScene(envScene, 0.04)
  geometries.forEach((g) => g.dispose())
  materials.forEach((m) => m.dispose())
  pmrem.dispose()
  return rt.texture
}
