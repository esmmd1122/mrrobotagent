export function devRevealAllowed(
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.NODE_ENV === 'production') return false
  if (env.VERCEL_ENV === 'production') return false
  return env.OTP_DEV_REVEAL === 'true'
}

const buckets = new Map<string, { count: number; reset: number }>()

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
