import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { SESSION_COOKIE } from '@/lib/auth/constants'
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_JWT_KIND } from '@/lib/customer-auth/constants'
import { STUDIO_COOKIE } from '@/modules/salon/cookies'

const ADMIN_LOGIN = '/admin/login'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/uploads/fulfillment')) {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (pathname.startsWith('/salon') || pathname.startsWith('/studio')) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-mr-chrome', 'bare')
    if (
      pathname.startsWith('/studio') &&
      !pathname.startsWith('/studio/login') &&
      !pathname.startsWith('/studio/register') &&
      !pathname.startsWith('/api/studio/login') &&
      !pathname.startsWith('/api/studio/register')
    ) {
      const token = request.cookies.get(STUDIO_COOKIE)?.value
      const secret = process.env.AUTH_SECRET
      if (!token || !secret || secret.length < 32) {
        return NextResponse.redirect(new URL('/studio/login', request.url))
      }
      try {
        await jwtVerify(token, new TextEncoder().encode(secret))
      } catch {
        const res = NextResponse.redirect(new URL('/studio/login', request.url))
        res.cookies.delete(STUDIO_COOKIE)
        return res
      }
    }
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (pathname.startsWith('/account')) {
    if (pathname === '/account/login' || pathname === '/account/register') {
      return NextResponse.next()
    }
    const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
    const secret = process.env.AUTH_SECRET
    if (!token || !secret || secret.length < 32) {
      return NextResponse.redirect(new URL('/account/login', request.url))
    }
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
      if (payload.kind !== CUSTOMER_JWT_KIND) {
        const res = NextResponse.redirect(new URL('/account/login', request.url))
        res.cookies.delete(CUSTOMER_SESSION_COOKIE)
        return res
      }
      return NextResponse.next()
    } catch {
      const res = NextResponse.redirect(new URL('/account/login', request.url))
      res.cookies.delete(CUSTOMER_SESSION_COOKIE)
      return res
    }
  }

  if (pathname.startsWith('/api/store/account')) {
    const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
    const secret = process.env.AUTH_SECRET
    if (!token || !secret || secret.length < 32) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
      if (payload.kind !== CUSTOMER_JWT_KIND) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.next()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (pathname.startsWith('/api/store/auth')) {
    return NextResponse.next()
  }

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
  matcher: [
    '/uploads/fulfillment/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/studio/:path*',
    '/salon/:path*',
    '/account/:path*',
    '/api/store/account/:path*',
  ],
  // Login: /admin/login — Preview cookie for draft site read in getActiveWebsiteConfig
}
