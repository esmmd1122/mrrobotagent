import fs from 'node:fs'

for (const dir of ['.next/dev', '.next/cache', '.next/turbopack']) {
  fs.rmSync(dir, { recursive: true, force: true })
}
