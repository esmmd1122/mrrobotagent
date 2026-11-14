# Database migrations

## Existing environments (SQLite with data)

The baseline migration `20251114120000_baseline` captures the current schema. If the database was created with `prisma db push`, mark the baseline as already applied **without** running its SQL:

```bash
npx prisma migrate resolve --applied 20251114120000_baseline
```

## New environments

```bash
npx prisma migrate deploy
npx prisma db seed
```

Do not use `prisma migrate reset` on production or any database that must keep customer, order, payment, salon, or notification data.

## Fulfillment files

After deploying, run:

```bash
npm run migrate:fulfillment-files
```

Use `--dry-run` first to inspect planned moves from `public/uploads` to `data/private/quarantine`.