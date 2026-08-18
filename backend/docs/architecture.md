# Backend Architecture

## Stack

- Node.js with Express 5.
- TypeScript.
- PostgreSQL with Prisma 7 and `@prisma/adapter-pg`.
- Zod for request validation.
- JWT access and refresh tokens.
- HTTP-only refresh cookie.
- Winston logger with Morgan request logging.

## Application Pipeline

`src/app.ts` defines the middleware and route order:

1. `GET /health` checks database connectivity with `SELECT 1`.
2. Morgan request logging streams to Winston.
3. Helmet security headers with CSP disabled.
4. Compression, cookie parser, and JSON parser.
5. CORS with `credentials: true` and `env.CORS_ORIGIN`.
6. `/uploads` static files with cross-origin resource policy override.
7. `/api/v1/internal` job routes before CSRF and rate limiting.
8. `csrfProtection`.
9. `apiLimiter`.
10. Versioned `/api/v1/*` routers.
11. `cleanupUploadsOnError`.
12. Global `errorHandler`.

## Mounted Modules

```text
/api/v1/auth
/api/v1/signup-requests
/api/v1/admin/signup-requests
/api/v1/users
/api/v1/dashboard
/api/v1/items
/api/v1/leads
/api/v1/prospects
/api/v1/quotations
/api/v1/reports
/api/v1/organizations
/api/v1/audit-logs
/api/v1/announcements
/api/v1/billing
/api/v1/notifications
/api/v1/platform-settings
/api/v1/internal
```

Each business module follows the route-controller-service-repository split when it has persistence:

- `*.route.ts`: paths and middleware chain.
- `*.controller.ts`: HTTP boundary and response envelope.
- `*.service.ts`: business rules, authorization, cross-entity checks.
- `*.repository.ts`: Prisma access.
- Contracts live in `src/contracts/*`.

## Auth Model

- Login/signup return an access token in the JSON body.
- The refresh token is stored as an HTTP-only `refresh_token` cookie scoped to `/api/v1/auth`.
- Protected routes require `Authorization: Bearer <accessToken>`.
- Refresh tokens are hashed before storage in `RefreshToken`.
- Refresh rotation keeps a 30-second grace window for multi-tab refresh and detects token reuse.
- Password changes revoke all refresh tokens and invalidate older access tokens through `passwordChangedAt`.

## Multi-Tenancy

Tenant routes use `requireOrganization`.

- Normal users are pinned to their own `organizationId`.
- Super admin users must provide `x-organization-id` for tenant data routes.
- Platform routes such as audit, announcements, billing console, organizations, and platform settings enforce scope inside their services or are intentionally unscoped.

Tenant data writes in users, items, leads, prospects, and quotations are also protected by `enforceSubscription`.

## Authorization

`allowPermission` checks permissions from `src/constants/rolePermissions.ts`.

- `SUPER_ADMIN` has all permissions.
- `ADMIN` can manage tenant users, CRM data, org settings, reports, audit, announcements, and read billing.
- `MANAGER` can manage most CRM data and users but not platform/billing/admin-only actions.
- `EXECUTIVE` can read/update assigned CRM data and reports.

Some service methods add narrower rules, such as super-admin-only password reset and authoring scope rules for announcements.

## Billing And Features

Plans and subscriptions are first-class models:

- `Plan` and `PlanFeature` define catalog terms.
- `Subscription` is unique per organization.
- `SubscriptionFeatureOverride` replaces selected feature values for enterprise deals.
- `resolveSubscriptionState` derives the effective status instead of trusting `Subscription.status` alone.
- Feature gates use `requireFeature`.

## Background Jobs

Internal job endpoints use `requireInternalSecret` and run outside browser middleware:

- Follow-up notifications.
- Subscription lifecycle checks.
- Token cleanup.
- Audit retention.

The internal router is intentionally mounted before CSRF and rate limiting.

## Response And Error Contracts

Controllers return `ApiResponse.ok` or `ApiResponse.created` for JSON success. CSV exports write directly to the response.

Errors flow through `AppError`, Prisma/Zod handling, and the global `errorHandler`, which returns:

```json
{
  "success": false,
  "error": "Access denied",
  "code": 403,
  "errorCode": "ORG_FORBIDDEN"
}
```
