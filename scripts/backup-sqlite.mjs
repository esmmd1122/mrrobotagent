import { copyFile, mkdir } from 'fs/promises'
import path from 'path'

const source = path.join('prisma', 'dev.db')
const dir = path.join('prisma', 'backups')
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const target = path.join(dir, `dev-${stamp}.db`)
await mkdir(dir, { recursive: true })
await copyFile(source, target)
console.log(`SQLite backup written: ${target}`)
