/**
 * Vercel build: generate Prisma Client for PostgreSQL (Neon) without mutating schema.prisma.
 * Does not run migrations (SQLite migration SQL is not compatible with PostgreSQL).
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const sqliteSchema = path.join('prisma', 'schema.prisma')
const postgresSchema = path.join('prisma', 'schema.postgresql.prisma')
const generatedSchemaPath = path.join('node_modules', '.prisma', 'client', 'schema.prisma')

function isPostgresUrl(url) {
  return url.startsWith('postgres://') || url.startsWith('postgresql://')
}

function failBuild(message) {
  console.error(`Vercel build aborted: ${message}`)
  process.exit(1)
}

function assertGeneratedClientIsPostgres() {
  if (!fs.existsSync(generatedSchemaPath)) {
    failBuild(
      'Generated Prisma Client not found after prisma generate. Expected embedded schema under node_modules/.prisma/client.',
    )
  }
  const embedded = fs.readFileSync(generatedSchemaPath, 'utf8')
  const providerMatch = embedded.match(/provider\s*=\s*"(\w+)"/)
  const provider = providerMatch?.[1]
  if (provider !== 'postgresql') {
    failBuild(
      `Generated Prisma Client datasource provider is "${provider ?? 'unknown'}", expected "postgresql". SQLite is not supported on Vercel.`,
    )
  }
  console.log('Vercel build: verified generated Prisma Client uses provider postgresql')
}

const onVercel = Boolean(process.env.VERCEL)
const dbUrl = process.env.DATABASE_URL || ''
const directUrl = process.env.DIRECT_URL || ''

if (onVercel) {
  if (!dbUrl) {
    failBuild('DATABASE_URL is required on Vercel (pooled PostgreSQL URL).')
  }
  if (!isPostgresUrl(dbUrl)) {
    failBuild('DATABASE_URL must start with postgres:// or postgresql://. SQLite file URLs are not supported on Vercel.')
  }
  if (!directUrl) {
    failBuild('DIRECT_URL is required on Vercel for Prisma generate (direct PostgreSQL URL, non-pooler host).')
  }
  if (!isPostgresUrl(directUrl)) {
    failBuild('DIRECT_URL must start with postgres:// or postgresql://.')
  }

  console.log(`Vercel build: prisma generate --schema=${postgresSchema}`)
  execSync(`npx prisma generate --schema=${postgresSchema}`, { stdio: 'inherit', env: process.env })
  assertGeneratedClientIsPostgres()
  execSync('npx next build', { stdio: 'inherit', env: process.env })
} else {
  console.log(`Local build wrapper: prisma generate --schema=${sqliteSchema}`)
  execSync(`npx prisma generate --schema=${sqliteSchema}`, { stdio: 'inherit', env: process.env })
  execSync('npx next build', { stdio: 'inherit', env: process.env })
}