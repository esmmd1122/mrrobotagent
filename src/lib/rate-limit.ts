const buckets = new Map<string, { count: number; reset: number }>()

/** In-memory sliding window limiter for API abuse protection (per process). */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const row = buckets.get(key)
  if (!row || row.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (row.count >= limit) return false
  row.count += 1
  return true
}