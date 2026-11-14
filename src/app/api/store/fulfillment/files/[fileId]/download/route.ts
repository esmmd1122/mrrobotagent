import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyCustomerSessionToken } from '@/lib/customer-auth/session-token'
import { CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth/constants'
import { prisma } from '@/lib/db'
import {
  createFileDownloadGrant,
  readStoredFileBytes,
  resolveCustomerFulfillmentFile,
  resolveCustomerFulfillmentFileForSession,
} from '@/modules/fulfillment/file-download'

type Ctx = { params: Promise<{ fileId: string }> }

export async function GET(req: Request, context: Ctx) {
  const { fileId } = await context.params
  const url = new URL(req.url)
  const orderNumber = url.searchParams.get('orderNumber') || ''
  const viewToken = url.searchParams.get('token') || ''
  const authMode = url.searchParams.get('auth') || ''
  const exp = Number(url.searchParams.get('exp'))
  const sig = url.searchParams.get('sig') || ''

  if (!orderNumber || !exp || !sig) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let resolved:
    | Awaited<ReturnType<typeof resolveCustomerFulfillmentFile>>
    | Awaited<ReturnType<typeof resolveCustomerFulfillmentFileForSession>>

  if (authMode === 'session') {
    const cookieStore = await cookies()
    const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value
    const session = token ? await verifyCustomerSessionToken(token) : null
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    resolved = await resolveCustomerFulfillmentFileForSession(fileId, orderNumber, session.sub, {
      exp,
      sig,
    })
  } else {
    if (!viewToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    resolved = await resolveCustomerFulfillmentFile(fileId, orderNumber, viewToken, { exp, sig })
  }

  if (!resolved.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: resolved.code === 'NOT_FOUND' ? 404 : 403 })
  }

  const stored = await prisma.orderFulfillmentFile.findUnique({
    where: { id: fileId },
    select: { url: true },
  })
  if (!stored?.url) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { bytes, mimeType } = await readStoredFileBytes(stored.url)
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(resolved.file.filename)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File unavailable' }, { status: 404 })
  }
}

/** Issue short-lived grant for client link (optional helper). */
export async function POST(req: Request, context: Ctx) {
  const { fileId } = await context.params
  const body = await req.json()
  const orderNumber = String(body.orderNumber || '')
  const viewToken = String(body.viewToken || '')
  if (!orderNumber || !viewToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const grant = createFileDownloadGrant(fileId, orderNumber, viewToken)
  const check = await resolveCustomerFulfillmentFile(fileId, orderNumber, viewToken, grant)
  if (!check.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ ok: true, ...grant })
}