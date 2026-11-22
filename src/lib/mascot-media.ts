/**
 * Pure media helpers for the official MR.ROBOT mascot avatar and CMS-managed section images.
 * Uses only permanently committed public assets and validated persistent storage URLs.
 */

export const OFFICIAL_MASCOT_AVATAR_PRIMARY = '/images/mr-robot-character.png'
export const OFFICIAL_MASCOT_AVATAR_FALLBACK = '/images/mr-robot-cinematic.jpg'

export const OFFICIAL_MASCOT_FALLBACK_CHAIN = [
  OFFICIAL_MASCOT_AVATAR_PRIMARY,
  OFFICIAL_MASCOT_AVATAR_FALLBACK,
] as const

/**
 * Advances to the next fallback image source when an image fails to load.
 * Returns null once all fallbacks have been exhausted.
 */
export function resolveNextMascotAvatarSrc(currentSrc: string): string | null {
  const index = OFFICIAL_MASCOT_FALLBACK_CHAIN.indexOf(
    currentSrc as (typeof OFFICIAL_MASCOT_FALLBACK_CHAIN)[number],
  )
  if (index === -1) return OFFICIAL_MASCOT_AVATAR_PRIMARY
  const next = OFFICIAL_MASCOT_FALLBACK_CHAIN[index + 1]
  return next ?? null
}

/**
 * Validates and normalizes an optional section image URL for safe public rendering.
 * Blocks dangerous schemes (javascript:, data:, vbscript:) and protocol-relative URLs,
 * and rejects legacy ephemeral /assets/aistudio/ paths that do not exist in production.
 */
export function resolveSafeSectionImageUrl(raw: string | null | undefined): string | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null

  // Reject ephemeral AI Studio attachment paths that are not present in production deployments
  if (/^\/?assets\/aistudio\//i.test(trimmed)) {
    return null
  }

  // Allow safe root-relative paths (/images/..., /uploads/...)
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('..') || trimmed.includes('\\')) {
      return null
    }
    return trimmed
  }

  // Allow standard http/https URLs only
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString()
    }
  } catch {
    return null
  }

  return null
}

/**
 * Checks whether a validated URL can be rendered via Next.js <Image> without throwing
 * an unconfigured-hostname runtime error.
 */
export function isNextImageCompatibleSrc(url: string): boolean {
  if (url.startsWith('/') && !url.startsWith('//')) return true
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    return host === 'res.cloudinary.com' || host.endsWith('.cloudinary.com')
  } catch {
    return false
  }
}
