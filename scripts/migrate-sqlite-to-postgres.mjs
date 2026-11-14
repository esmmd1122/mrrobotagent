import { DatabaseSync } from 'node:sqlite'
import path from 'path'

const postgresUrl = process.env.POSTGRES_URL
if (!postgresUrl) {
  console.error('POSTGRES_URL is not set. No data was copied and production migration did not run.')
  process.exit(2)
}

const { default: pg } = await import('pg')
const sqlite = new DatabaseSync(path.join('prisma', 'dev.db'))
const tables = sqlite.prepare(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name",
).all().map((row) => row.name)

const parentFirst = [
  'AdminRole', 'AdminUser', 'ProductCategory', 'Product', 'Customer', 'Order', 'OrderItem',
  'Payment', 'PaymentTransaction', 'PaymentGatewayConfig', 'AIServiceOffering', 'AIServiceRequest',
  'SupportTicket', 'SupportMessage', 'SiteContent', 'WebsiteSettings', 'WebsiteSettingsRevision',
  'MediaAsset', 'SitePage', 'DiscountCode', 'ActivityLog', 'Business', 'Service', 'WorkingHours',
  'User', 'Appointment', 'SalonPlan', 'SalonBusiness', 'SalonBranch', 'SalonMembership',
  'SalonBusinessHour', 'SalonBusinessBreak', 'SalonExceptionHour', 'SalonHoliday', 'SalonEmployee',
  'SalonEmployeeHour', 'SalonEmployeeBreak', 'SalonDayOff', 'SalonEmployeeBlock',
  'SalonServiceCategory', 'SalonOffering', 'SalonEmployeeService', 'SalonGuest', 'SalonBooking',
  'SalonOtp', 'SalonSubscription', 'SalonNotification', 'SalonAiUsage', 'SalonAudit',
]
const ordered = [...parentFirst.filter((name) => tables.includes(name)), ...tables.filter((name) => !parentFirst.includes(name))]

const client = new pg.Client({ connectionString: postgresUrl })
await client.connect()
try {
  const occupied = []
  for (const table of ordered) {
    const count = await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`)
    if (count.rows[0].count > 0) occupied.push(table)
  }
  if (occupied.length) {
    console.error(`Target already has rows in: ${occupied.join(', ')}. Nothing was changed.`)
    process.exit(3)
  }
  await client.query('BEGIN')
  for (const table of ordered) {
    const columns = sqlite.prepare(`PRAGMA table_info("${table}")`).all()
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all()
    for (const row of rows) {
      const names = columns.map((column) => column.name)
      const values = names.map((name) => normalize(row[name]))
      const placeholders = names.map((_, index) => `$${index + 1}`).join(', ')
      await client.query(
        `INSERT INTO "${table}" (${names.map((name) => `"${name}"`).join(', ')}) VALUES (${placeholders})`,
        values,
      )
    }
    const sourceCount = rows.length
    const targetCount = (await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`)).rows[0].count
    if (sourceCount !== targetCount) {
      throw new Error(`Count mismatch for ${table}: sqlite ${sourceCount}, postgres ${targetCount}`)
    }
    console.log(`${table}: ${sourceCount}`)
  }
  await client.query('COMMIT')
  console.log('Migration committed. SQLite file was not modified.')
} catch (error) {
  await client.query('ROLLBACK')
  console.error(error instanceof Error ? error.message : 'Migration failed and was rolled back.')
  process.exit(1)
} finally {
  await client.end()
  sqlite.close()
}

function normalize(value) {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number' && value > 1_000_000_000_000) return new Date(value).toISOString()
  return value
}
