const SECRET_NAMES = ['DATABASE_URL', 'AUTH_SECRET', 'REDIS_URL', 'GEMINI_API_KEY', 'S3_SECRET_ACCESS_KEY']

export function isProductionRuntime(env: NodeJS.ProcessEnv = process.env) {
  if (env.NEXT_PHASE === 'phase-production-build') return false
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production'
}

export function productionProblems(env: NodeJS.ProcessEnv = process.env) {
  if (!isProductionRuntime(env)) return []
  const problems: string[] = []
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32 || env.AUTH_SECRET.includes('change-me')) {
    problems.push('AUTH_SECRET')
  }
  if (!env.DATABASE_URL || env.DATABASE_URL.startsWith('file:')) {
    problems.push('DATABASE_URL')
  }
  if (!env.REDIS_URL) problems.push('REDIS_URL')
  if (env.OTP_DEV_REVEAL === 'true') problems.push('OTP_DEV_REVEAL')
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    problems.push('S3_STORAGE')
  }
  return problems
}

export function assertProductionEnv() {
  const problems = productionProblems()
  if (!problems.length) return
  throw new Error(`Production startup rejected missing or unsafe configuration: ${problems.join(', ')}`)
}

export function safeClientMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message === 'SMS_NOT_CONFIGURED' || error.message === 'OTP_LIMIT_UNAVAILABLE') {
      return 'سرویس تایید موقتاً در دسترس نیست'
    }
    if (error.message === 'OTP_RATE_LIMIT' || error.message === 'OTP_COOLDOWN') {
      return 'درخواست بیش از حد است. کمی بعد دوباره تلاش کنید'
    }
  }
  const text = error instanceof Error ? error.message : ''
  if (SECRET_NAMES.some((name) => text.includes(name)) || text.includes('postgres://') || text.includes('file:')) {
    return fallback
  }
  return fallback
}
