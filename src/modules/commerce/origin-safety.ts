const SAFE_HOST_RE = /^[a-z0-9.-]+(?::\d{1,5})?$/i

/**
 * Safely computes the application origin without allowing Host/Proto header injection.
 * Prefers configured APP_URL / NEXT_PUBLIC_APP_URL when valid.
 */
export function sanitizeAppOrigin(input: {
  forwardedProto?: string | null
  forwardedHost?: string | null
  host?: string | null
  envAppUrl?: string | null
  fallbackOrigin?: string
}): string {
  const configured = input.envAppUrl?.trim()
  if (configured) {
    try {
      const parsed = new URL(configured)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin
      }
    } catch {
      // Fall through to header/fallback checks
    }
  }

  const rawProto = (input.forwardedProto || '').split(',')[0]?.trim().toLowerCase()
  const proto = rawProto === 'https' || rawProto === 'http' ? rawProto : 'http'

  const rawHost = (input.forwardedHost || input.host || '').split(',')[0]?.trim()
  if (rawHost && SAFE_HOST_RE.test(rawHost) && !rawHost.includes('..')) {
    return `${proto}://${rawHost}`
  }

  if (input.fallbackOrigin) {
    try {
      const parsed = new URL(input.fallbackOrigin)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin
      }
    } catch {
      // Fall through
    }
  }

  return 'http://localhost:3000'
}
