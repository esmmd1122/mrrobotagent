import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { SESSION_COOKIE } from '@/lib/auth/constants'

const ADMIN_LOGIN = '/admin/login'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()
  if (pathname === ADMIN_LOGIN) return NextResponse.next()
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const secret = process.env.AUTH_SECRET

  if (!token || !secret || secret.length < 32) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url))
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret))
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url))
    res.cookies.delete(SESSION_COOKIE)
    return res
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
  // Login: /admin/login — Preview cookie for draft site read in getActiveWebsiteConfig
}
