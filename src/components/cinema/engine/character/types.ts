import type * as THREE from 'three'
import type { CharacterPose } from '../keyframes'
import type { AssistantAnimState } from './assistant-state'

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
 * 1) The official multi-part procedural 3D MR.ROBOT mascot (ProceduralMrRobotRig), and
 * 2) Future official rigged MR.ROBOT .glb/.gltf models (GltfCharacterAdapter)
 *    with skeletal AnimationMixer, PBR materials, head/gaze bones, and auto-framing.
 */
export interface MrRobotCharacterController {
  readonly root: THREE.Group
  readonly hitProxy: THREE.Object3D
  pose: CharacterPose
  getAssetMetadata(): CharacterAssetMetadata
  setAssistantState(state: AssistantAnimState, chatOpen?: boolean): void
  triggerAttention(durationSec?: number): void
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
