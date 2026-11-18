import fs from 'fs'
import path from 'path'

const MODEL_BLOCK_RE = /^model (\w+) \{/gm

/**
 * @param {string} schemaText
 * @returns {Map<string, string>} model name -> normalized block (body only, no outer braces)
 */
export function extractModelBodies(schemaText) {
  const withoutPreamble = schemaText.replace(/^[\s\S]*?(?=^model )/m, '')
  const blocks = new Map()
  const parts = withoutPreamble.split(/\r?\n(?=model )/)
  for (const part of parts) {
    const open = part.match(/^model (\w+) \{/)
    if (!open) continue
    const name = open[1]
    const start = part.indexOf('{') + 1
    let depth = 1
    let i = start
    for (; i < part.length; i += 1) {
      const ch = part[i]
      if (ch === '{') depth += 1
      else if (ch === '}') {
        depth -= 1
        if (depth === 0) break
      }
    }
    const body = part.slice(start, i)
    blocks.set(name, normalizeBlock(body))
  }
  return blocks
}

function normalizeBlock(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() && !line.trim().startsWith('//'))
    .map((line) => line.trim())
    .join('\n')
}

export function comparePrismaSchemaFiles(sqlitePath, postgresPath) {
  const sqliteText = fs.readFileSync(sqlitePath, 'utf8')
  const postgresText = fs.readFileSync(postgresPath, 'utf8')
  const sqliteModels = extractModelBodies(sqliteText)
  const postgresModels = extractModelBodies(postgresText)

  const intentional = {
    datasource: 'postgresql schema uses provider postgresql, directUrl, and DATABASE_URL for runtime',
    generator: 'same prisma-client-js generator; output not customized to keep @prisma/client imports',
  }

  const errors = []
  const sqliteNames = new Set(sqliteModels.keys())
  const postgresNames = new Set(postgresModels.keys())

  for (const name of sqliteNames) {
    if (!postgresNames.has(name)) errors.push(`Model missing in PostgreSQL schema: ${name}`)
  }
  for (const name of postgresNames) {
    if (!sqliteNames.has(name)) errors.push(`Model extra in PostgreSQL schema: ${name}`)
  }

  for (const name of sqliteNames) {
    if (!postgresNames.has(name)) continue
    const a = sqliteModels.get(name)
    const b = postgresModels.get(name)
    if (a !== b) {
      errors.push(`Model body drift: ${name}`)
    }
  }

  return {
    ok: errors.length === 0,
    modelCount: sqliteModels.size,
    intentionalDifferences: intentional,
    errors,
  }
}

export function runSchemaParityCheck({
  sqlitePath = path.join('prisma', 'schema.prisma'),
  postgresPath = path.join('prisma', 'schema.postgresql.prisma'),
} = {}) {
  if (!fs.existsSync(postgresPath)) {
    return { ok: false, modelCount: 0, intentionalDifferences: {}, errors: [`Missing ${postgresPath}`] }
  }
  return comparePrismaSchemaFiles(sqlitePath, postgresPath)
}