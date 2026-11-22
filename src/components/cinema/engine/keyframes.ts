export type Vec3Tuple = [number, number, number]

export type CharacterPose = {
  lShX: number
  lShZ: number
  lElX: number
  rShX: number
  rShZ: number
  rElX: number
  orbScale: number
  orbPos: Vec3Tuple
  eyeGlow: number
  lookBiasX: number
}

export type StoryKeyframe = {
  cam: Vec3Tuple
  look: Vec3Tuple
  fov: number
  charPos: Vec3Tuple
  charRotY: number
  pose: CharacterPose
  fog: number
  rimC: number
  rimV: number
  stageScale: number
}

export type EvaluatedStoryFrame = {
  cam: Vec3Tuple
  look: Vec3Tuple
  fov: number
  charPos: Vec3Tuple
  charRotY: number
  pose: CharacterPose
  fogA: number
  fogB: number
  rimCA: number
  rimCB: number
  rimVA: number
  rimVB: number
  blend: number
  stageScale: number
  stagePos: Vec3Tuple
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smoothstep(x: number, min: number, max: number): number {
  if (x <= min) return 0
  if (x >= max) return 1
  const t = (x - min) / (max - min)
  return t * t * (3 - 2 * t)
}

/**
 * Exact 8 RTL-balanced story keyframes from the MR.ROBOT visual reference.
 * Desktop (>= 1040px) uses these coordinates verbatim.
 */
export const STORY_KEYFRAMES: readonly StoryKeyframe[] = [
  // 0: Hero (RTL: MR.ROBOT on Left, Headline Right — 3/4 stance matching official reference)
  {
    cam: [0.18, 1.24, 5.88],
    look: [-0.22, 0.86, 0],
    fov: 38,
    charPos: [-1.14, -0.04, 0.28],
    charRotY: 0.58,
    pose: {
      lShX: 0.12,
      lShZ: 0.14,
      lElX: -0.42,
      rShX: -0.24,
      rShZ: -0.18,
      rElX: -0.64,
      orbScale: 0.001,
      orbPos: [0.85, 0.52, 0.72],
      eyeGlow: 3.6,
      lookBiasX: 0.12,
    },
    fog: 0x05040b,
    rimC: 0x38bdf8,
    rimV: 0xef1d42,
    stageScale: 0.001,
  },
  // 1: Brand Identity (MR.ROBOT glides Right & manipulates floating Glass Core)
  {
    cam: [0.45, 1.26, 5.45],
    look: [0.25, 0.98, 0],
    fov: 37,
    charPos: [1.46, -0.06, 0.42],
    charRotY: -0.44,
    pose: {
      lShX: -0.78,
      lShZ: 0.32,
      lElX: -0.68,
      rShX: 0.08,
      rShZ: -0.15,
      rElX: -0.42,
      orbScale: 1.0,
      orbPos: [-0.88, 0.56, 0.78],
      eyeGlow: 3.7,
      lookBiasX: -0.18,
    },
    fog: 0x040a1a,
    rimC: 0x38bdf8,
    rimV: 0x3b82f6,
    stageScale: 0.001,
  },
  // 2: Services Showcase (Wide architectural crane shot, MR.ROBOT centered in depth)
  {
    cam: [0, 1.56, 7.6],
    look: [0, 0.92, 0],
    fov: 40,
    charPos: [0, 0.06, -2.0],
    charRotY: 0,
    pose: {
      lShX: -0.42,
      lShZ: 0.44,
      lElX: -0.52,
      rShX: -0.42,
      rShZ: -0.44,
      rElX: -0.52,
      orbScale: 0.001,
      orbPos: [0, 0.8, 0.9],
      eyeGlow: 3.2,
      lookBiasX: 0,
    },
    fog: 0x030816,
    rimC: 0x60a5fa,
    rimV: 0x2563eb,
    stageScale: 0.001,
  },
  // 3: Interactive 3D Marketplace (MR.ROBOT steps subtly into background so products take center stage)
  {
    cam: [-0.22, 1.14, 6.2],
    look: [-0.48, 0.92, 0.45],
    fov: 38,
    charPos: [2.85, -0.45, -2.9],
    charRotY: -0.58,
    pose: {
      lShX: -0.58,
      lShZ: 0.28,
      lElX: -0.62,
      rShX: 0.1,
      rShZ: -0.14,
      rElX: -0.35,
      orbScale: 0.001,
      orbPos: [-0.9, 0.6, 0.8],
      eyeGlow: 3.4,
      lookBiasX: -0.36,
    },
    fog: 0x030917,
    rimC: 0x38bdf8,
    rimV: 0x1d4ed8,
    stageScale: 0.001,
  },
  // 4: AI Technology Experience (Violet-Cyan neural mood; MR.ROBOT Left in Conductor Stance)
  {
    cam: [-0.32, 1.3, 5.15],
    look: [-0.3, 1.02, 0],
    fov: 36,
    charPos: [-1.52, -0.05, 0.35],
    charRotY: 0.4,
    pose: {
      lShX: -0.74,
      lShZ: 0.3,
      lElX: -0.78,
      rShX: -0.74,
      rShZ: -0.3,
      rElX: -0.78,
      orbScale: 1.15,
      orbPos: [0.0, 0.62, 0.92],
      eyeGlow: 4.3,
      lookBiasX: 0.08,
    },
    fog: 0x08061c,
    rimC: 0x38bdf8,
    rimV: 0x8b5cf6,
    stageScale: 0.001,
  },
  // 5: Apple & Mobile Precision Lab (Clean crisp electric-blue; MR.ROBOT Right)
  {
    cam: [0.32, 1.24, 5.6],
    look: [0.22, 0.96, 0],
    fov: 37,
    charPos: [1.56, -0.08, -0.1],
    charRotY: -0.38,
    pose: {
      lShX: -0.52,
      lShZ: 0.22,
      lElX: -0.82,
      rShX: -0.25,
      rShZ: -0.16,
      rElX: -0.65,
      orbScale: 0.72,
      orbPos: [-0.76, 0.6, 0.76],
      eyeGlow: 3.3,
      lookBiasX: -0.16,
    },
    fog: 0x040b1c,
    rimC: 0x60a5fa,
    rimV: 0x0ea5e9,
    stageScale: 0.001,
  },
  // 6: Trust & Support (Calm authoritative symmetry in depth)
  {
    cam: [0, 1.32, 7.1],
    look: [0, 0.9, 0],
    fov: 39,
    charPos: [0, -0.02, -2.2],
    charRotY: 0,
    pose: {
      lShX: 0.06,
      lShZ: 0.16,
      lElX: -0.38,
      rShX: 0.06,
      rShZ: -0.16,
      rElX: -0.38,
      orbScale: 0.001,
      orbPos: [0, 0.7, 0.8],
      eyeGlow: 3.1,
      lookBiasX: 0,
    },
    fog: 0x030a19,
    rimC: 0x38bdf8,
    rimV: 0x2563eb,
    stageScale: 0.001,
  },
  // 7: Final Brand Finale (Heroic symmetrical cinema low-angle push-in)
  {
    cam: [0, 1.18, 4.75],
    look: [0, 1.06, 0],
    fov: 35,
    charPos: [0, 0.06, 0.42],
    charRotY: 0,
    pose: {
      lShX: 0.08,
      lShZ: 0.14,
      lElX: -0.36,
      rShX: 0.08,
      rShZ: -0.14,
      rElX: -0.36,
      orbScale: 0.001,
      orbPos: [0, 0.7, 0.8],
      eyeGlow: 4.5,
      lookBiasX: 0,
    },
    fog: 0x070410,
    rimC: 0x38bdf8,
    rimV: 0xef1d42,
    stageScale: 0.001,
  },
]

export function lerpPose(a: CharacterPose, b: CharacterPose, t: number): CharacterPose {
  return {
    lShX: lerp(a.lShX, b.lShX, t),
    lShZ: lerp(a.lShZ, b.lShZ, t),
    lElX: lerp(a.lElX, b.lElX, t),
    rShX: lerp(a.rShX, b.rShX, t),
    rShZ: lerp(a.rShZ, b.rShZ, t),
    rElX: lerp(a.rElX, b.rElX, t),
    orbScale: lerp(a.orbScale, b.orbScale, t),
    orbPos: [
      lerp(a.orbPos[0], b.orbPos[0], t),
      lerp(a.orbPos[1], b.orbPos[1], t),
      lerp(a.orbPos[2], b.orbPos[2], t),
    ],
    eyeGlow: lerp(a.eyeGlow, b.eyeGlow, t),
    lookBiasX: lerp(a.lookBiasX, b.lookBiasX, t),
  }
}

export function evaluateStoryFrame(
  rawProgress: number,
  viewportWidth: number,
): EvaluatedStoryFrame {
  const maxIndex = STORY_KEYFRAMES.length - 1
  const clamped = clamp(rawProgress, 0, maxIndex)
  const i0 = Math.floor(clamped)
  const i1 = Math.min(maxIndex, i0 + 1)
  const f = smoothstep(clamped - i0, 0, 1)

  const kfA = STORY_KEYFRAMES[i0]
  const kfB = STORY_KEYFRAMES[i1]

  const isCompact = viewportWidth < 1040
  const isMobile = viewportWidth < 680
  const xScale = isCompact ? 0.14 : 1.0

  // On mobile/tablet hero (scene 0), frame MR.ROBOT's hood, red crown, headphones, glowing red eyes,
  // and upper torso cleanly in the unobstructed upper window above the mobile hero copy card.
  const heroWeight = 1 - smoothstep(clamped, 0.15, 0.85)
  const marketWeight =
    smoothstep(clamped, 2.35, 2.95) * (1 - smoothstep(clamped, 3.35, 3.95))
  const mobileLookYOffset = isMobile ? -0.66 * heroWeight : isCompact ? -0.38 * heroWeight : 0
  const mobileCharYOffset = isMobile
    ? 0.62 * heroWeight - 0.85 * marketWeight
    : isCompact
      ? 0.24 * heroWeight - 0.55 * marketWeight
      : 0
  const mobileCamZBoost = isMobile ? 1.55 + 1.4 * marketWeight : isCompact ? 0.95 : 0

  const cam: Vec3Tuple = [
    lerp(kfA.cam[0], kfB.cam[0], f) * xScale,
    lerp(kfA.cam[1], kfB.cam[1], f),
    lerp(kfA.cam[2], kfB.cam[2], f) + mobileCamZBoost,
  ]

  const look: Vec3Tuple = [
    lerp(kfA.look[0], kfB.look[0], f) * xScale,
    lerp(kfA.look[1], kfB.look[1], f) + mobileLookYOffset,
    lerp(kfA.look[2], kfB.look[2], f),
  ]

  const charPos: Vec3Tuple = [
    lerp(kfA.charPos[0], kfB.charPos[0], f) * xScale,
    lerp(kfA.charPos[1], kfB.charPos[1], f) + mobileCharYOffset,
    lerp(kfA.charPos[2], kfB.charPos[2], f) - (isMobile ? 1.8 * marketWeight : 0),
  ]

  const stagePresence = lerp(kfA.stageScale, kfB.stageScale, f)

  return {
    cam,
    look,
    fov: lerp(kfA.fov, kfB.fov, f) + (isMobile ? 3 : 0),
    charPos,
    charRotY: lerp(kfA.charRotY, kfB.charRotY, f) * (isCompact ? 0.65 : 1.0),
    pose: lerpPose(kfA.pose, kfB.pose, f),
    fogA: kfA.fog,
    fogB: kfB.fog,
    rimCA: kfA.rimC,
    rimCB: kfB.rimC,
    rimVA: kfA.rimV,
    rimVB: kfB.rimV,
    blend: f,
    stageScale: stagePresence * (isMobile ? 0.74 : isCompact ? 0.85 : 1.0),
    stagePos: isCompact ? [0.0, 1.12, 1.05] : [-1.22, 1.12, 1.32],
  }
}
