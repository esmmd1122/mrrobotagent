export type AssistantAnimState =
  | 'idle'
  | 'attention'
  | 'listening'
  | 'thinking'
  | 'speaking'

export type AssistantMotionOutput = {
  /** Additional yaw (Y rotation) applied to headRig */
  headYawOffset: number
  /** Additional pitch (X rotation) applied to headRig */
  headPitchOffset: number
  /** Subtle head roll (Z rotation) */
  headRollOffset: number
  /** Upper-body subtle sway/nod for speaking & acknowledgment */
  bodyPitchOffset: number
  /** Multiplier applied to breathing amplitude */
  breathScale: number
  /** Target multiplier on emissive crimson eyes */
  eyeGlowMultiplier: number
  /** Target emissive intensity for headphone crimson rings */
  ringGlowIntensity: number
  /** Target opacity/emissive pulse for the crimson back halo ring */
  haloIntensity: number
  /** Rotation velocity for the halo processing accent */
  haloSpinSpeed: number
  /** Subtle attentiveness adjustment on arms (no exaggerated gestures) */
  armLiftOffset: number
}

/**
 * Pure deterministic animation state evaluator for the official MR.ROBOT 3D mascot.
 * Explicitly produces restrained, smooth upper-body, head, eye-glow, and halo lighting
 * kinematics — never invents mouth animation because the official character is faceless.
 */
export function evaluateAssistantMotion(
  state: AssistantAnimState,
  elapsed: number,
  stateElapsed: number,
  reducedMotion: boolean,
  chatOpen: boolean,
): AssistantMotionOutput {
  const m = reducedMotion ? 0.28 : 1.0
  // When desktop chat panel is open on the right, subtly angle gaze slightly toward the panel
  const chatTurnYaw = chatOpen ? 0.14 * m : 0

  switch (state) {
    case 'attention': {
      // Crisp acknowledgment double-nod that settles smoothly within ~1.2s
      const env = Math.exp(-stateElapsed * 2.2)
      const ackNod = Math.sin(stateElapsed * 7.4) * 0.085 * env * m
      return {
        headYawOffset: chatTurnYaw + 0.05 * env * m,
        headPitchOffset: ackNod - 0.03 * m,
        headRollOffset: Math.sin(elapsed * 1.1) * 0.028 * m,
        bodyPitchOffset: ackNod * 0.25,
        breathScale: 1.08,
        eyeGlowMultiplier: 1.32 + 0.14 * env,
        ringGlowIntensity: 4.4,
        haloIntensity: 1.35 + 0.25 * env,
        haloSpinSpeed: 0.45 * m,
        armLiftOffset: -0.05 * m,
      }
    }

    case 'listening': {
      // Focused, steady attentiveness toward the visitor/chat panel
      return {
        headYawOffset: chatTurnYaw + 0.04 * m,
        headPitchOffset: -0.045 * m + Math.sin(elapsed * 1.4) * 0.014 * m,
        headRollOffset: 0.045 * m + Math.sin(elapsed * 0.85) * 0.015 * m,
        bodyPitchOffset: 0.018 * m,
        breathScale: 0.92,
        eyeGlowMultiplier: 1.22 + Math.sin(elapsed * 3.1) * 0.06 * m,
        ringGlowIntensity: 4.0,
        haloIntensity: 1.18 + Math.sin(elapsed * 2.2) * 0.1 * m,
        haloSpinSpeed: 0.35 * m,
        armLiftOffset: -0.04 * m,
      }
    }

    case 'thinking': {
      // Restrained futuristic neural processing pulse & subtle contemplative tilt
      const scanWave = 0.5 + 0.5 * Math.sin(elapsed * 5.2)
      return {
        headYawOffset: chatTurnYaw * 0.65 + Math.sin(elapsed * 1.15) * 0.07 * m,
        headPitchOffset: -0.065 * m + Math.sin(elapsed * 1.7) * 0.022 * m,
        headRollOffset: -0.06 * m + Math.cos(elapsed * 1.3) * 0.022 * m,
        bodyPitchOffset: 0.01 * m,
        breathScale: 0.85,
        eyeGlowMultiplier: 1.15 + scanWave * 0.48 * m,
        ringGlowIntensity: 3.4 + scanWave * 2.0 * m,
        haloIntensity: 1.2 + scanWave * 0.55 * m,
        haloSpinSpeed: 1.45 * m,
        armLiftOffset: -0.08 * m,
      }
    }

    case 'speaking': {
      // Restrained conversational upper-body & head cadence (zero mouth motion)
      const cadence =
        (Math.sin(elapsed * 4.4) * 0.55 + Math.sin(elapsed * 7.1 + 0.8) * 0.35) * m
      return {
        headYawOffset: chatTurnYaw + Math.sin(elapsed * 2.1) * 0.055 * m,
        headPitchOffset: cadence * 0.042,
        headRollOffset: Math.sin(elapsed * 1.8) * 0.032 * m,
        bodyPitchOffset: cadence * 0.018,
        breathScale: 1.12,
        eyeGlowMultiplier: 1.24 + Math.abs(cadence) * 0.22,
        ringGlowIntensity: 4.1 + Math.abs(cadence) * 0.8,
        haloIntensity: 1.25 + Math.abs(cadence) * 0.22,
        haloSpinSpeed: 0.6 * m,
        armLiftOffset: -0.06 * m + cadence * 0.025,
      }
    }

    case 'idle':
    default: {
      return {
        headYawOffset: chatTurnYaw,
        headPitchOffset: 0,
        headRollOffset: Math.sin(elapsed * 0.72) * 0.024 * m,
        bodyPitchOffset: 0,
        breathScale: 1.0,
        eyeGlowMultiplier: 1.0 + Math.sin(elapsed * 2.6) * 0.08 * m,
        ringGlowIntensity: 3.3,
        haloIntensity: 0.92 + Math.sin(elapsed * 1.7) * 0.08 * m,
        haloSpinSpeed: 0.18 * m,
        armLiftOffset: 0,
      }
    }
  }
}

/**
 * Computes eyelid vertical scale [0.05..1.0] for natural sharp-eye blinking.
 */
export function evaluateBlinkEyeScale(blinkPhaseRad: number, isBlinking: boolean): number {
  if (!isBlinking) return 1.0
  if (blinkPhaseRad <= 0 || blinkPhaseRad >= Math.PI) return 1.0
  return Math.max(0.05, 1.0 - Math.sin(blinkPhaseRad))
}
