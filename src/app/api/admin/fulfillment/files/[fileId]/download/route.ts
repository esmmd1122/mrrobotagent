import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { readStoredFileBytes, resolveAdminFulfillmentFile } from '@/modules/fulfillment/file-download'

type Ctx = { params: Promise<{ fileId: string }> }

export async function GET(_req: Request, context: Ctx) {
  const auth = await requireAdminApi(PERMISSIONS.ORDERS_MANAGE)
  if (auth.error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.error === 'FORBIDDEN' ? 403 : 401 })
  }

  const { fileId } = await context.params
  const file = await resolveAdminFulfillmentFile(fileId)
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const { bytes, mimeType } = await readStoredFileBytes(file.url)
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File unavailable' }, { status: 404 })
  }
}