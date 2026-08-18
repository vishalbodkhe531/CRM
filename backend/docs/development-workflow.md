# Development Workflow

## Local Setup

```bash
cd backend
npm install
```

Create or update `.env.development` with the variables required by `src/config/env.ts`, then run:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run seed:plans
npm run dev
```

The backend defaults to port `5000`.

## Required Environment

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | `development` or `production`; selects `.env.development` or `.env.production` |
| `PORT` | Defaults to `5000` |
| `DATABASE_URL` | PostgreSQL URL |
| `DIRECT_URL` | Optional direct database URL for Prisma CLI workflows |
| `JWT_SECRET` | At least 32 characters |
| `JWT_REFRESH_SECRET` | At least 32 characters |
| `JWT_ACCESS_EXPIRY` | Duration like `15m` |
| `JWT_REFRESH_EXPIRY` | Duration like `7d` |
| `CORS_ORIGIN` | Comma-separated allowed frontend origins |
| `INTERNAL_JOB_SECRET` | Optional, but internal job routes fail closed when unset |
| `EMAIL_USER`, `EMAIL_PASS` | Optional mail credentials |
| `LOG_LEVEL` | Defaults to `info` |

## Commands

```bash
npm run dev
npm run build
npm run start
npm run verify
npm run prisma:generate
npm run prisma:migrate
npm run prisma:status
npm run prisma:studio
npm run seed
npm run seed:plans
npm run db:inspect-plans
npm run db:migrate:pooled
npm run db:reset-tenants
```

`npm run build` generates Prisma client, removes `dist`, and compiles TypeScript.

## Feature Delivery Order

1. Update Prisma models and migrations if persistence changes.
2. Update contract constants, types, and validation schemas.
3. Add or adjust repository methods.
4. Implement service rules, tenant checks, transactions, and audit events.
5. Wire controller response handling.
6. Wire route path, middleware order, permissions, and validation.
7. Update frontend contracts/API calls if the contract changed.
8. Update docs.
9. Run build and relevant verification scripts.

## Verification Scripts

The `verify` script runs targeted checks from `src/scripts/runVerifications.ts`, covering areas such as:

- Tenant scope.
- Billing API/enforcement/status filters.
- Plan lifecycle and feature resolution.
- Dashboard stats.
- Notifications and jobs.
- Audit export.
- Announcement visibility.

Use direct scripts only when narrowing a failure.

## Supabase Note

If the local network cannot reach the direct Supabase database host, use the Supavisor Session pooler URL in `DATABASE_URL` and keep the direct string in `DIRECT_URL` for CLI operations.
