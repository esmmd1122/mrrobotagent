# MR.ROBOT AI salon SaaS

This module is separate from the public MR.ROBOT storefront and the commerce admin. Legacy chat booking tables (`Business`, `Service`, `Appointment`) are not modified.

## Routes

- Owner workspace: `/studio/register`, `/studio/login`, `/studio`
- Public booking: `/salon/{slug}`
- Platform control: `/admin/platform` (existing admin session, permission `platform:manage`)

## Environment

- `DATABASE_URL` — current local default is SQLite. Production should use PostgreSQL by changing the Prisma datasource and running a controlled migration. Do not point a fresh provider at this file and expect an automatic copy.
- `AUTH_SECRET` — required, 32+ characters.
- `OTP_DEV_REVEAL=true` — local only. Returns the OTP in the API response when `NODE_ENV` is not `production`. Never enable this in production.
- `SMS_PROVIDER_URL` and `SMS_PROVIDER_TOKEN` — optional HTTP SMS provider. Without them, production OTP requests fail closed.
- `GEMINI_API_KEY` — optional. Without it, the receptionist answers only from stored salon data and says Gemini is not configured. It does not create bookings by itself.

## Schedule and booking rules

Owners manage holidays, weekly salon breaks, exceptional hours, employee breaks, full-day leave, and date-specific unavailable periods at `/studio/schedule`. Slot calculation in `src/modules/salon/engine.ts` reads those rows. Minimum advance, booking horizon, cancellation deadline, and buffer are stored on `SalonBusiness` and checked on the server.

## SQLite-specific behavior

- `prisma/schema.prisma` datasource provider is `sqlite`.
- Statuses and roles are strings, not database enums.
- Appointment overlap is prevented with a nullable unique `SalonBooking.slotKey`, not a PostgreSQL exclusion constraint.
- Dates for holidays and leave are `YYYY-MM-DD` strings in Asia/Tehran, not native date columns.
- JSON settings elsewhere in the commerce module are stored as strings.
- SQLite serializes writers on one file. It is not a durable multi-instance store on Vercel.
- There is no `prisma/migrations` history yet. Schema changes have been applied with `prisma db push`.

## PostgreSQL migration plan

Do not run this against the current file until a backup is verified. This document does not perform the migration.

1. Stop writes. Copy `prisma/dev.db` and export a logical dump with `sqlite3 prisma/dev.db .dump` if the SQLite CLI is installed.
2. Create an empty PostgreSQL database and a dedicated user. Put its URL only in the target environment.
3. Change the Prisma datasource provider to `postgresql` in a separate branch. Replace the `slotKey` uniqueness plan with the same unique column first; add a later exclusion constraint only after data is loaded.
4. Run `prisma migrate diff` from the SQLite schema to the PostgreSQL schema and review the SQL. Do not use `migrate reset` or `db push --force-reset`.
5. Load data with a reviewed copy tool. Keep UUID strings as `text` or `uuid` consistently. Convert Tehran date strings explicitly.
6. Run `npm run test:salon` against a disposable PostgreSQL database, then compare row counts for `Product`, `Order`, `SalonBusiness`, and `SalonBooking` with the SQLite source.
7. Rollback by pointing `DATABASE_URL` back at the untouched SQLite file or by restoring the PostgreSQL dump taken immediately before cutover. Do not delete the SQLite file until the new database has served real traffic.

## Backup and restore (SQLite local)

Stop the app, copy `prisma/dev.db`, then restart. Restore by replacing that file with the copy while the app is stopped. For PostgreSQL, use `pg_dump` / `pg_restore`. Migrations must be additive; do not reset a database that already has storefront or salon rows.

## Security notes

- Guest booking routes resolve the salon from the URL slug and require `guest.businessId` to match that row. The phone comes from the signed cookie, not the request body.
- Studio mutations load `businessId` from the membership row. A staff member can change only a booking assigned to their `employeeId`.
- `OTP_DEV_REVEAL` is ignored when `NODE_ENV` or `VERCEL_ENV` is `production`.
- OTP and AI rate limits are in-memory and reset per process. They are not sufficient as the only protection on multiple servers.
- Sessions are HTTP-only cookies signed with `AUTH_SECRET`. Studio sessions last 12 hours. Guest OTP sessions last 2 hours.

## Not in this version

Online card payments, a product store, voice calls, and delivery receipts for SMS, email, or Telegram. In-app salon notifications are stored in `SalonNotification`.
