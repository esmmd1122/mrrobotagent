/**
 * Copies legacy fulfillment files from public/uploads into data/private/quarantine
 * and updates OrderFulfillmentFile.url to private:quarantine/...
 *
 * Does not delete source files. Safe to re-run (skips rows already using private:).
 */
import { PrismaClient } from '@prisma/client'
import { copyFile, mkdir, access } from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

function isAlreadyPrivate(url) {
  return url.startsWith('private:')
}

function normalizeLegacyUrl(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const u = new URL(url)
      return u.pathname.replace(/^\//, '')
    } catch {
      return null
    }
  }
  return url.replace(/^\//, '')
}

async function fileExists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const files = await prisma.orderFulfillmentFile.findMany({ select: { id: true, url: true } })
  let moved = 0
  let skipped = 0
  let missing = 0

  for (const row of files) {
    if (isAlreadyPrivate(row.url)) {
      skipped++
      continue
    }
    const rel = normalizeLegacyUrl(row.url)
    if (!rel || !rel.startsWith('uploads/')) {
      console.warn(`[skip] ${row.id}: unsupported url ${row.url}`)
      skipped++
      continue
    }

    const publicPath = path.join(process.cwd(), 'public', rel)
    const quarantineRel = `quarantine/${rel}`
    const targetPath = path.join(process.cwd(), 'data', 'private', quarantineRel)
    const nextUrl = `private:${quarantineRel.replaceAll('\\', '/')}`

    if (!(await fileExists(publicPath))) {
      if (await fileExists(targetPath)) {
        if (!dryRun) {
          await prisma.orderFulfillmentFile.update({ where: { id: row.id }, data: { url: nextUrl } })
        }
        console.log(`[db-only] ${row.id} -> ${nextUrl} (source already quarantined)`)
        moved++
        continue
      }
      console.warn(`[missing] ${row.id}: ${publicPath}`)
      missing++
      continue
    }

    if (!dryRun) {
      await mkdir(path.dirname(targetPath), { recursive: true })
      await copyFile(publicPath, targetPath)
      await prisma.orderFulfillmentFile.update({ where: { id: row.id }, data: { url: nextUrl } })
    }
    console.log(`[moved] ${row.id} -> ${nextUrl}`)
    moved++
  }

  console.log(JSON.stringify({ total: files.length, moved, skipped, missing, dryRun }, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())