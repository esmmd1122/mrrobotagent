# Neon PostgreSQL cutover runbook

Ordered steps for moving MR.ROBOT from local SQLite (`prisma/dev.db`) to Neon PostgreSQL and Vercel. **Do not run destructive commands until you have explicitly approved each phase.**

Tracked Neon metadata (no secrets): project id `gentle-mountain-55555187`, org id `org-lingering-bread-94667206`, default branch name `production` (see `.neon` in the repo).

---

## A. Preparation

### A.1 Confirm Neon project and branch

1. Open the Neon console for project `gentle-mountain-55555187`.
2. Choose the target branch (recommend a **new empty branch** for a dry run, then `production` for the real cutover).
3. Record **branch name** and **database name** (often `neondb`) — you will verify these in migration script output (`migrate:postgres` prints host and database, not the password).

### A.2 Pooled vs direct URLs

| Variable | Connection type | Used by |
|----------|------------------|---------|
| `DATABASE_URL` | **Pooled** (pooler hostname) | Next.js / Prisma Client at runtime on Vercel |
| `DIRECT_URL` | **Direct** (non-pooler hostname) | Prisma CLI with `prisma/schema.postgresql.prisma` when `DATABASE_URL` is pooled (`directUrl` in schema) |
| `POSTGRES_URL` | **Direct** | `npm run migrate:postgres` only (long `INSERT` transaction) |

Always use `?sslmode=require` (or Neon’s recommended SSL params). Never commit real URLs or passwords.

### A.3 Verify target is empty

Before any schema push or data migration:

- New Neon branch, **or**
- Manual check that every application table has **zero rows** (the migrate script refuses non-empty targets with **exit code 3**).

### A.4 Why SQLite migrations must not run on PostgreSQL

- `prisma/migrations/*/migration.sql` uses SQLite types (`DATETIME`, `TEXT`, `REAL`, …).
- `prisma/migrations/migration_lock.toml` has `provider = "sqlite"`.
- `prisma migrate deploy` against Neon would be wrong for this repository until you create a **separate PostgreSQL migration history**.

Production schema on Neon should come from **`prisma/schema.postgresql.prisma`** (see phase B), not from replaying SQLite migration files.

---

## B. Schema initialization (structure only, no app data)

**Goal:** Empty PostgreSQL tables matching Prisma models. **This is not the SQLite data copy.**

### B.1 Prerequisites

- `DATABASE_URL` and `DIRECT_URL` point at the **same empty** Neon branch (direct URL on `DIRECT_URL`, pooled on `DATABASE_URL` if you use pooling locally for CLI tests).
- `MR_ROBOT_CONFIRM_DB_WRITE=1` is **not** required for `db push` (Prisma CLI); use normal caution and confirm the branch identity in the Neon console.

### B.2 Commands (documented only — run when approved)

```bash
# Validate schema file (no database connection required for parity)
npm run check:prisma-schemas

# Optional: generate client locally against postgres schema (no DB write)
npx prisma generate --schema=prisma/schema.postgresql.prisma

# Apply model definitions to empty Postgres (ONE-TIME per branch; review diff in CLI output)
npx prisma db push --schema=prisma/schema.postgresql.prisma
```

**Do not use:**

- `prisma migrate deploy` with the existing `prisma/migrations` folder.
- `prisma db push --force-reset` on a branch that already has production data.

### B.3 After schema push

- Confirm tables exist (Neon SQL editor or `\dt` equivalent).
- Do **not** seed production unless you intend to discard SQLite data.

---

## C. SQLite backup and data migration

**Goal:** Copy row data from `prisma/dev.db` into the empty PostgreSQL schema. **Does not modify** the SQLite file.

### C.1 Backup (SQLite)

```bash
set MR_ROBOT_CONFIRM_DB_WRITE=1
npm run backup:sqlite
```

Verify console output:

- `source_integrity: ok`
- `backup_integrity: ok`
- Non-zero `backup_size_bytes`
- New file under `prisma/backups/dev-<timestamp>.db` (preserves prior backups)

### C.2 Data migration

```bash
set MR_ROBOT_CONFIRM_DB_WRITE=1
set POSTGRES_URL=postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require
npm run migrate:postgres
```

Script behavior:

- Prints **target PostgreSQL identity** (host, database, user — no password).
- Refuses if **any table has rows** → **exit 3** (non-empty target).
- Refuses without `MR_ROBOT_CONFIRM_DB_WRITE=1` or `--yes` → **exit 2**.
- Runs in a transaction; **rolls back** on count mismatch or insert errors.
- Prints a **migration report** with per-table row counts.

### C.3 Verification

1. Compare migration report totals to expectations (catalog products, admin user, orders).
2. Spot-check in app (against a **staging** deployment or local app temporarily pointed at Neon — only after you consciously change `.env`, never commit credentials).
3. `npm run test:store` and `npm run test:migrate-scripts` on the dev machine (no live Neon required for migrate-script tests).

### C.4 Do not re-run after production writes

Once Vercel serves traffic against PostgreSQL, **do not** run `migrate:postgres` again to “refresh” data. It is designed for **empty** targets only. New production data would be lost or the run would refuse. Use PostgreSQL backups instead.

---

## D. Vercel production configuration

### D.1 Required environment variables (minimum store)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Neon **pooled** PostgreSQL URL |
| `AUTH_SECRET` | ≥ 32 characters, not the `.env.example` placeholder |
| `MR_ROBOT_STORE_ONLY` | `true` until Redis and S3 are configured |

### D.2 Full stack (salon / studio / uploads)

Also set `REDIS_URL`, S3 variables, disable `OTP_DEV_REVEAL`, SMS provider vars as in `docs/production.md`.

`DIRECT_URL` — **required on Vercel** (build fails without it). Same database as `DATABASE_URL`, direct host. Also used for local Prisma CLI against `schema.postgresql.prisma` when `DATABASE_URL` is pooled.

### D.3 Build

- `vercel.json` uses `node scripts/vercel-build.mjs`.
- On Vercel the build requires **pooled** `DATABASE_URL` and **direct** `DIRECT_URL`, both PostgreSQL URLs. No SQLite fallback.
- Runs `prisma generate --schema=prisma/schema.postgresql.prisma`, verifies generated client provider is `postgresql`, then `next build`. Does **not** edit `prisma/schema.prisma`.
- Local `npm run build` still uses `prisma/schema.prisma` (SQLite) via default `prisma generate`.

### D.4 Deploy and health check (when approved)

1. Set Vercel env vars; trigger deployment.
2. `GET /api/health` should return `{ "ok": true }`.
3. Test admin login, storefront catalog, checkout path as appropriate.

Startup validation (`src/lib/env/production.ts`) rejects `file:` `DATABASE_URL` on `VERCEL_ENV=production`. Preview deployments skip the strict production gate.

---

## E. Rollback

### E.1 Before traffic cutover

- Keep `DATABASE_URL` on SQLite for any environment still on file DB.
- Neon branch can be deleted or reset if unused.
- Retain timestamped files in `prisma/backups/`.

### E.2 After PostgreSQL has production writes

- **Do not** copy SQLite back over PostgreSQL — you will lose orders and bookings created on Neon after cutover.
- Restore from a **Neon branch snapshot / backup** taken before risky changes.
- Point Vercel `DATABASE_URL` at the restored branch or previous known-good connection string.

### E.3 Before risky operations

Take a Neon snapshot or create a backup branch before `db push`, manual SQL, or re-deployment experiments on `production`.

---

## Related files

| File | Role |
|------|------|
| `prisma/schema.prisma` | Local SQLite source of truth for models |
| `prisma/schema.postgresql.prisma` | Production PostgreSQL datasource |
| `npm run check:prisma-schemas` | Detect model drift between the two schemas |
| `scripts/migrate-sqlite-to-postgres.mjs` | Data copy (gated) |
| `docs/production.md` | General production env and Vercel notes |