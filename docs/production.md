# Production deployment

The running application still uses SQLite at `prisma/dev.db`. PostgreSQL migration code is ready, but it has not been executed because `POSTGRES_URL` is not configured. Do not delete `prisma/dev.db`.

## Required production variables

- `NODE_ENV=production`
- `AUTH_SECRET` — at least 32 characters and not the example value
- `DATABASE_URL` — **pooled** PostgreSQL URL for the running app (Vercel / production). A `file:` URL is rejected at startup.
- `DIRECT_URL` — **direct** PostgreSQL URL (non-pooler host). Required on Vercel at build time for `prisma generate` with `schema.postgresql.prisma`. Not used by the Next.js runtime unless you run Prisma CLI locally.
- `POSTGRES_URL` — **direct** URL used **only** by `npm run migrate:postgres` (data copy). Not read by the application.
- `REDIS_URL` — shared OTP limits. If Redis is down, OTP fails closed.
- `OTP_DEV_REVEAL` — must not be `true`
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` — logos, covers, and admin media. Local disk uploads are refused in production.
- `S3_ENDPOINT` and `S3_REGION` — optional, for S3-compatible storage
- `SMS_PROVIDER_URL` and `SMS_PROVIDER_TOKEN` — required for real SMS. Without them, OTP cannot be delivered.
- `GEMINI_API_KEY` — optional. Absence does not crash startup; the receptionist uses stored salon data only.

Startup checks live in `src/lib/env/production.ts` and run from `src/instrumentation.ts`. They do not run during `next build`.

## Commands

Both scripts require explicit confirmation (`MR_ROBOT_CONFIRM_DB_WRITE=1` or `--yes`). They never delete or truncate data.

```bash
set MR_ROBOT_CONFIRM_DB_WRITE=1
npm run backup:sqlite
npm run migrate:postgres
npm run test:salon
npm run test:e2e
```

`migrate:postgres` stops if `POSTGRES_URL` is missing or if the target already contains rows. It copies IDs in a transaction and rolls back on a count mismatch. It does not modify the SQLite file.

After the copy is verified, set Vercel environment variables (see Vercel section below). **Do not** edit `prisma/schema.prisma` for production — models stay in sync via `prisma/schema.postgresql.prisma` and `npm run check:prisma-schemas`. Do not run `prisma db push --force-reset`.

**Schema vs data on Neon:** creating tables (`db push` against `schema.postgresql.prisma`) is separate from copying SQLite rows (`npm run migrate:postgres`). Apply schema to an empty database first, then run data migration once.

Booking overlap uses the unique `slotKey` on every database. On PostgreSQL it also takes `pg_advisory_xact_lock` inside the booking transaction. SQLite keeps the unique key only, because advisory locks are not available there.

## Rollback

1. Keep the SQLite backup created by `npm run backup:sqlite`.
2. If PostgreSQL cutover fails before traffic switches, leave `DATABASE_URL` on the SQLite file and do not delete either database.
3. If traffic already used PostgreSQL, restore the PostgreSQL dump taken before cutover. Do not copy the old SQLite file back over new bookings taken after launch.

## Health

`GET /api/health` returns `{ "ok": true }` when the database answers `SELECT 1`. Failures return 503 without the database error.

## Vercel

`vercel.json` uses `node scripts/vercel-build.mjs`. On Vercel the build **fails closed** unless:

- `DATABASE_URL` is set and uses `postgres://` or `postgresql://` (pooled Neon URL recommended).
- `DIRECT_URL` is set and uses a PostgreSQL URL (direct / non-pooler host).

The script runs `prisma generate --schema=prisma/schema.postgresql.prisma`, verifies the generated client’s datasource is `postgresql`, then `next build`. It **never** falls back to SQLite and **does not** modify `prisma/schema.prisma`. Local development keeps using `prisma/schema.prisma` via `npm run build` or `postinstall`.

| Schema file | Purpose |
|-------------|---------|
| `prisma/schema.prisma` | Local SQLite (`file:./dev.db`) |
| `prisma/schema.postgresql.prisma` | Production PostgreSQL (Neon) |

**First-time Postgres (Neon):** `prisma/migrations` are SQLite-only — do **not** run `migrate deploy` on Neon. See `docs/neon-cutover.md`: (1) `db push` with `schema.postgresql.prisma` on an **empty** branch, (2) then `npm run migrate:postgres` for **data** from a verified SQLite backup.

**Minimum store deployment on Vercel (production):**

- `AUTH_SECRET` (32+ chars, not the example)
- `DATABASE_URL` (pooled PostgreSQL)
- `DIRECT_URL` (direct PostgreSQL)
- `MR_ROBOT_STORE_ONLY=true` if Redis/S3 are not ready yet (homepage + store work; salon/studio/OTP/file uploads need full config)

**Full stack (salon + media):** all variables in the list above, including `REDIS_URL` and S3 keys.

`instrumentation.ts` rejects unsafe production config when `VERCEL_ENV=production`. Preview deployments (`VERCEL_ENV=preview`) skip that gate so PR builds can render.

Set **Node.js 20.x** in the Vercel project. Root directory is the repository root; build output is Next default.
