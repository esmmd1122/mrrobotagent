import fs from 'fs'
import path from 'path'

const FIELD_RE = /^\s+(\w+)\s+(\w+[?]?|\w+\[\])\s/

/**
 * @returns {Map<string, Set<string>>} model name -> field names (scalar columns only, no relations)
 */
export function parsePrismaSchema(schemaText) {
  const models = new Map()
  let current = null
  const scalarTypes = new Set([
    'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'BigInt', 'Decimal',
  ])
  for (const line of schemaText.split(/\r?\n/)) {
    const modelMatch = line.match(/^model (\w+) \{/)
    if (modelMatch) {
      current = modelMatch[1]
      models.set(current, new Set())
      continue
    }
    if (current && line.trim() === '}') {
      current = null
      continue
    }
    if (!current) continue
    if (line.trim().startsWith('@@') || line.trim().startsWith('//')) continue
    const m = line.match(FIELD_RE)
    if (!m) continue
    const name = m[1]
    const typeToken = m[2].replace('?', '').replace('[]', '')
    if (scalarTypes.has(typeToken)) models.get(current).add(name)
  }
  return models
}

export function loadPrismaModels(schemaPath = path.join('prisma', 'schema.prisma')) {
  return parsePrismaSchema(fs.readFileSync(schemaPath, 'utf8'))
}