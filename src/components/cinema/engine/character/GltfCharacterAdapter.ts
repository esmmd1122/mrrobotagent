import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import type { AssistantAnimState, AssistantMotionOutput } from './assistant-state'
import type { PointerNormalized } from './types'

export type LoadedGltfCharacter = {
  model: THREE.Group
  mixer: THREE.AnimationMixer | null
  clipMap: Map<string, THREE.AnimationAction>
  clipNames: string[]
  activeClip: string | null
  headBone: THREE.Object3D | null
  baseHeadRotation: THREE.Euler | null
  eyeMaterials: THREE.MeshStandardMaterial[]
}

function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (!mat) continue
      const std = mat as THREE.MeshStandardMaterial
      std.map?.dispose()
      std.normalMap?.dispose()
      std.roughnessMap?.dispose()
      std.metalnessMap?.dispose()
      std.emissiveMap?.dispose()
      std.aoMap?.dispose()
      mat.dispose()
    }
  })
}

const STATE_CLIP_PATTERNS: Record<AssistantAnimState, RegExp> = {
  idle: /idle|stand|breathe/i,
  attention: /attention|greet|nod|wave|alert/i,
  listening: /listen|focus|idle/i,
  thinking: /think|process|scan|idle/i,
  speaking: /speak|talk|gesture|idle/i,
}

/**
 * Modular GLB/GLTF character adapter prepared for the official rigged MR.ROBOT model.
 * Handles auto-normalization to exact studio scale/grounding, PBR shadow tuning,
 * skeletal AnimationMixer playback + cross-fades, Head/Neck bone gaze tracking,
 * and assistant state mapping (idle, attention, listening, thinking, speaking).
 */
export class GltfCharacterAdapter {
  private readonly loader = new GLTFLoader()
  private current: LoadedGltfCharacter | null = null

  get isLoaded(): boolean {
    return this.current !== null
  }

  get clipNames(): string[] {
    return this.current?.clipNames ?? []
  }

  get activeClip(): string | null {
    return this.current?.activeClip ?? null
  }

  async load(
    urlOrBlobUrl: string,
    slot: THREE.Group,
    options?: { targetHeight?: number; floorYOffset?: number },
  ): Promise<LoadedGltfCharacter> {
    const targetHeight = options?.targetHeight ?? 3.15
    const floorYOffset = options?.floorYOffset ?? -1.38

    const gltf = await new Promise<GLTF>((resolve, reject) => {
      this.loader.load(urlOrBlobUrl, resolve, undefined, reject)
    })

    this.clear(slot)

    const model = gltf.scene
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const scale = targetHeight / Math.max(size.y, 0.001)
    model.scale.setScalar(scale)
    model.position.set(
      -center.x * scale,
      -box.min.y * scale + floorYOffset,
      -center.z * scale,
    )

    let headBone: THREE.Object3D | null = null
    const eyeMaterials: THREE.MeshStandardMaterial[] = []

    model.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (/eye|visor|glow/i.test(mesh.name)) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const mat of mats) {
            if (mat && 'emissiveIntensity' in mat) {
              eyeMaterials.push(mat as THREE.MeshStandardMaterial)
            }
          }
        }
      }
      if (!headBone && /head|neck/i.test(child.name)) {
        headBone = child
      }
    })

    let mixer: THREE.AnimationMixer | null = null
    const clipMap = new Map<string, THREE.AnimationAction>()
    const clipNames: string[] = []
    let activeClip: string | null = null

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model)
      gltf.animations.forEach((clip, idx) => {
        const name = clip.name?.trim() || `Clip_${idx + 1}`
        clipNames.push(name)
        clipMap.set(name, mixer!.clipAction(clip))
      })

      const preferred =
        clipNames.find((n) => /idle|stand|breathe/i.test(n)) ?? clipNames[0]
      if (preferred) {
        clipMap.get(preferred)?.play()
        activeClip = preferred
      }
    }

    slot.add(model)

    const baseHeadRotation = headBone
      ? (headBone as THREE.Object3D).rotation.clone()
      : null

    this.current = {
      model,
      mixer,
      clipMap,
      clipNames,
      activeClip,
      headBone,
      baseHeadRotation,
      eyeMaterials,
    }

    return this.current
  }

  playClip(clipName: string): boolean {
    if (!this.current) return false
    const nextAction = this.current.clipMap.get(clipName)
    if (!nextAction) return false
    const prevAction = this.current.activeClip
      ? this.current.clipMap.get(this.current.activeClip)
      : null
    if (prevAction && prevAction !== nextAction) {
      prevAction.fadeOut(0.35)
    }
    nextAction.reset().fadeIn(0.35).play()
    this.current.activeClip = clipName
    return true
  }

  applyAssistantState(state: AssistantAnimState) {
    if (!this.current || this.current.clipNames.length === 0) return
    const matcher = STATE_CLIP_PATTERNS[state]
    const matched = this.current.clipNames.find((name) => matcher.test(name))
    if (matched && matched !== this.current.activeClip) {
      this.playClip(matched)
    }
  }

  update(
    delta: number,
    mouse: PointerNormalized,
    lookBiasX: number,
    reducedMotion: boolean,
    motion?: AssistantMotionOutput,
  ) {
    if (!this.current) return
    if (this.current.mixer) {
      this.current.mixer.update(delta * (reducedMotion ? 0.35 : 1.0))
    }

    if (this.current.headBone && this.current.baseHeadRotation) {
      const m = reducedMotion ? 0.25 : 1.0
      const yawAdd = motion?.headYawOffset ?? 0
      const pitchAdd = motion?.headPitchOffset ?? 0
      const rollAdd = motion?.headRollOffset ?? 0

      const targetY =
        this.current.baseHeadRotation.y +
        THREE.MathUtils.clamp(mouse.x * 0.28 + lookBiasX * 0.7 + yawAdd, -0.5, 0.5) * m
      const targetX =
        this.current.baseHeadRotation.x +
        THREE.MathUtils.clamp(-mouse.y * 0.14 + pitchAdd, -0.24, 0.24) * m
      const targetZ = this.current.baseHeadRotation.z + rollAdd

      this.current.headBone.rotation.y = THREE.MathUtils.damp(
        this.current.headBone.rotation.y,
        targetY,
        6,
        delta,
      )
      this.current.headBone.rotation.x = THREE.MathUtils.damp(
        this.current.headBone.rotation.x,
        targetX,
        6,
        delta,
      )
      this.current.headBone.rotation.z = THREE.MathUtils.damp(
        this.current.headBone.rotation.z,
        targetZ,
        5,
        delta,
      )
    }

    if (motion && this.current.eyeMaterials.length > 0) {
      const targetGlow = 3.2 * motion.eyeGlowMultiplier
      for (const mat of this.current.eyeMaterials) {
        mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, targetGlow, 6, delta)
      }
    }
  }

  clear(slot: THREE.Group) {
    if (this.current) {
      this.current.mixer?.stopAllAction()
      disposeObject3D(this.current.model)
      this.current = null
    }
    while (slot.children.length > 0) {
      slot.remove(slot.children[0])
    }
  }
}
