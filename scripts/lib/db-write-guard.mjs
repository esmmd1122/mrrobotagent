/**
 * Require explicit opt-in before any script writes to databases or backup files.
 * Set MR_ROBOT_CONFIRM_DB_WRITE=1 or pass confirm: true from tests.
 */
export function assertDbWriteAllowed(env = process.env, argv = process.argv) {
  if (env.MR_ROBOT_CONFIRM_DB_WRITE === '1' || env.MR_ROBOT_CONFIRM_DB_WRITE === 'true') return
  if (argv.includes('--yes') || argv.includes('-y')) return
  throw new Error(
    'Refusing to write: set MR_ROBOT_CONFIRM_DB_WRITE=1 or pass --yes to confirm this operation.',
  )
}

export function describePostgresTarget(connectionString) {
  try {
    const url = new URL(connectionString)
    return {
      host: url.hostname,
      database: url.pathname.replace(/^\//, '') || '(default)',
      user: url.username || '(none)',
      ssl: url.searchParams.has('sslmode') ? url.searchParams.get('sslmode') : url.protocol.endsWith('+ssl') ? 'yes' : 'default',
    }
  } catch {
    return { host: '(unparsed)', database: '(unparsed)', user: '(unparsed)', ssl: 'unknown' }
  }
}