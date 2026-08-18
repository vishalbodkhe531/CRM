# Backend Folder Structure

```text
backend/
|-- docs/
|-- prisma/
|   |-- schema.prisma
|   |-- models/
|   `-- migrations/
|-- src/
|   |-- app.ts
|   |-- index.ts
|   |-- config/
|   |-- constants/
|   |-- contracts/
|   |-- middlewares/
|   |-- modules/
|   |-- scripts/
|   |-- types/
|   `-- utils/
|-- package.json
`-- tsconfig.json
```

## `src` Roots

| Folder | Purpose |
| --- | --- |
| `config` | env, db, logger, multer |
| `constants` | permissions, roles, role permissions, HTTP/error constants |
| `contracts` | shared constants, DTO types, Zod validation schemas, dashboard DTOs |
| `middlewares` | auth, permission, organization, subscription, feature, CSRF, rate limiting, validation, error handling |
| `modules` | route/controller/service/repository business modules |
| `scripts` | seeds, verification scripts, migration helpers, tenant reset |
| `types` | backend-only shared TypeScript types |
| `utils` | auth, audit, business, cache, db, errors, middleware, request, response, selectors, uploads, validation |

## Current Modules

```text
modules/
|-- announcement/
|-- audit/
|-- auth/
|-- billing/
|-- dashboard/
|-- item/
|-- jobs/
|-- lead/
|-- notification/
|-- organization/
|-- platformSettings/
|-- prospect/
|-- quotation/
|-- reports/
|-- signupRequest/
`-- user/
```

## Module Convention

Most persistence-backed modules use:

```text
<module>/
|-- <module>.route.ts
|-- <module>.controller.ts
|-- <module>.service.ts
`-- <module>.repository.ts
```

Some modules also include helpers, import/calculator files, validators, or mappers:

- `lead.helpers.ts`, `lead.import.ts`, `lead.validation.ts`
- `quotation.calculator.ts`
- `dashboard.mapper.ts`
- `billing/limit.guard.ts`

## Contracts Layout

```text
contracts/
|-- constants/
|-- dashboard/
|-- types/
`-- validation/
```

Validation schemas are the canonical request-body/query contracts for routes.

## Prisma Layout

```text
prisma/
|-- schema.prisma
|-- models/
|   |-- announcement.prisma
|   |-- audit_log.prisma
|   |-- billing.prisma
|   |-- item.prisma
|   |-- lead.prisma
|   |-- lead_sequence.prisma
|   |-- notification.prisma
|   |-- organization.prisma
|   |-- platform_settings.prisma
|   |-- prospect.prisma
|   |-- quotation.prisma
|   |-- signup_request.prisma
|   |-- token.prisma
|   |-- user.prisma
|   `-- user_sequence.prisma
`-- migrations/
```
