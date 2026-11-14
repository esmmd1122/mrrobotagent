export function customerSessionCookieOptions(nodeEnv = process.env.NODE_ENV) {
  const isProd = nodeEnv === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  }
}