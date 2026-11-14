# Production deployment

The running application still uses SQLite at `prisma/dev.db`. PostgreSQL migration code is ready, but it has not been executed because `POSTGRES_URL` is not configured. Do not delete `prisma/dev.db`.

## Required production variables

- `NODE_ENV=production`
- `AUTH_SECRET` — at least 32 characters and not the example value
- `DATABASE_URL` — PostgreSQL URL after a verified copy. A `file:` URL is rejected at startup.
- `POSTGRES_URL` — used only by `npm run migrate:postgres`
- `REDIS_URL` — shared OTP limits. If Redis is down, OTP fails closed.
- `OTP_DEV_REVEAL` — must not be `true`
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` — logos, covers, and admin media. Local disk uploads are refused in production.
- `S3_ENDPOINT` and `S3_REGION` — optional, for S3-compatible storage
- `SMS_PROVIDER_URL` and `SMS_PROVIDER_TOKEN` — required for real SMS. Without them, OTP cannot be delivered.
- `GEMINI_API_KEY` — optional. Absence does not crash startup; the receptionist uses stored salon data only.

Startup checks live in `src/lib/env/production.ts` and run from `src/instrumentation.ts`. They do not run during `next build`.

## Commands

```bash
npm run backup:sqlite
npm run migrate:postgres
npm run test:salon
npm run test:e2e
```

`migrate:postgres` stops if `POSTGRES_URL` is missing or if the target already contains rows. It copies IDs in a transaction and rolls back on a count mismatch. It does not modify the SQLite file.

After the copy is verified, set Vercel `DATABASE_URL` to that Postgres URL and change the Prisma datasource provider from `sqlite` to `postgresql` in a reviewed deployment. Then run `npx prisma generate`. Do not run `prisma db push --force-reset`.

Booking overlap uses the unique `slotKey` on every database. On PostgreSQL it also takes `pg_advisory_xact_lock` inside the booking transaction. SQLite keeps the unique key only, because advisory locks are not available there.

## Rollback

1. Keep the SQLite backup created by `npm run backup:sqlite`.
2. If PostgreSQL cutover fails before traffic switches, leave `DATABASE_URL` on the SQLite file and do not delete either database.
3. If traffic already used PostgreSQL, restore the PostgreSQL dump taken before cutover. Do not copy the old SQLite file back over new bookings taken after launch.

## Health

`GET /api/health` returns `{ "ok": true }` when the database answers `SELECT 1`. Failures return 503 without the database error.

## Vercel

`vercel.json` builds with `prisma generate && next build`. Set the variables above in the Vercel project. SQLite on Vercel is not durable. Redis and object storage must be managed services, not the local filesystem.
