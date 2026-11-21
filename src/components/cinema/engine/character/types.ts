import type * as THREE from 'three'
import type { CharacterPose } from '../keyframes'

export type PointerNormalized = {
  x: number
  y: number
}

export type CharacterAssetMetadata = {
  mode: 'procedural-reference' | 'official-gltf'
  sourceLabel: string
  animationClips: string[]
  activeClip: string | null
}

/**
 * Modular character contract supporting BOTH:
 * 1) The exact sculpted procedural reference character (ProceduralMrRobotRig), and
 * 2) Future official rigged MR.ROBOT .glb/.gltf models (GltfCharacterAdapter)
 *    with skeletal AnimationMixer, PBR materials, head/gaze bones, and auto-framing.
 */
export interface MrRobotCharacterController {
  readonly root: THREE.Group
  pose: CharacterPose
  getAssetMetadata(): CharacterAssetMetadata
  update(
    elapsed: number,
    delta: number,
    mouse: PointerNormalized,
    reducedMotion: boolean,
    productDragImpulse: number,
  ): void
  setEyePulseBoost(intensity: number): void
  loadOfficialModel(urlOrBlobUrl: string, label?: string): Promise<CharacterAssetMetadata>
  playAnimationClip(clipName: string): boolean
  resetToReferenceRig(): CharacterAssetMetadata
  dispose(): void
}
