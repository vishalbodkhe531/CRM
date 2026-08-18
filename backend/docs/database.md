# Database

## Technology

- PostgreSQL.
- Prisma ORM.
- Prisma client generated with `prisma-client-js`.
- Runtime database connection through `@prisma/adapter-pg`.

## Schema Layout

`backend/prisma/schema.prisma` contains only generator and datasource blocks. Models are split into `backend/prisma/models/*.prisma`.

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

## Core Tenant Models

| Model | Purpose | Tenant key |
| --- | --- | --- |
| `Organization` | Tenant root, branding assets, status, archive state | `id` |
| `User` | Identity, role, employee metadata, manager hierarchy | `organizationId` optional for super admin |
| `Item` | Product/service catalog | `organizationId` |
| `Lead` | Enquiry data, assignment, lifecycle status, soft delete | `organizationId` |
| `Prospect` | Converted lead sales opportunity and follow-up state | `organizationId` |
| `Quotation` | Quote header, totals, status, assignment, prospect link | `organizationId` |

Most tenant data supports soft delete through `deletedAt` and `deletedById`.

## Commercial Models

| Model | Purpose |
| --- | --- |
| `Plan` | Platform-level plan catalog |
| `PlanFeature` | Per-plan feature limits and toggles |
| `Subscription` | One live subscription row per organization |
| `SubscriptionFeatureOverride` | Per-organization feature override set |
| `PlatformSetting` | Singleton platform name, support contacts, audit retention, default plan |

Plan prices use `priceMinor` in the smallest currency unit. Current currency is INR.

## Communication And Audit Models

| Model | Purpose |
| --- | --- |
| `AuditLog` | Append-only audit trail with denormalized actor email/role |
| `Announcement` | Human-authored platform or organization broadcast |
| `AnnouncementReceipt` | Per-user read/dismiss state for announcements |
| `Notification` | Per-user system event notification |
| `SignupRequest` | Public signup inquiry workflow |

`AuditLog.action`, `AuditLog.entityType`, `Notification.type`, and `Notification.entityType` are strings constrained in TypeScript contracts so new values do not require migrations.

## Sequence Models

| Model | Purpose |
| --- | --- |
| `LeadSequence` | Per-organization lead numbering |
| `ProspectSequence` | Per-organization prospect numbering |
| `QuotationSequence` | Per-organization, per-year quotation numbering |
| `UserSequence` | Per-organization employee id numbering |

Sequence generation is protected in service code with transactions and, where needed, database locks/retries.

## Important Relations

- `Organization` has many users, leads, items, prospects, quotations, audit logs, announcements, notifications, and one subscription.
- `User` belongs to an organization except super admin users.
- `User.managerId` models manager/team hierarchy.
- `Lead.productInterestId` points to `Item`.
- `Prospect.leadId` is unique, preserving one prospect per converted lead.
- `Quotation.prospectId` optionally links quotations to prospects.
- `AnnouncementReceipt` is unique by `(announcementId, userId)`.
- `Subscription.organizationId` is unique.
- `PlanFeature` is unique by `(planId, featureKey)`.

## Index And Uniqueness Notes

Item code uniqueness for active rows is handled by a manual partial unique index in a migration:

```sql
CREATE UNIQUE INDEX unique_active_item_code
ON items (organization_id, item_code)
WHERE deleted_at IS NULL;
```

Other notable unique constraints:

- `Organization.slug`
- `Organization.prefix`
- `User.email`
- `User.employeeId`
- `Lead.leadNo`
- `Prospect.prospectNo`
- `(Quotation.organizationId, Quotation.quotationNo)`
- `Notification.dedupeKey`

## Migrations

Current migration history includes initial schema, optional email/mobile changes, lead custom industry, organization PDF assets, soft delete, audit logs, billing/plans, notifications, platform settings, and signup requests.

Useful commands:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:status
npm run prisma:studio
```

## Supabase Connectivity

For Supabase on IPv4-only networks, use the Supavisor Session pooler connection string in `DATABASE_URL`. Keep the direct connection string in `DIRECT_URL` for Prisma CLI operations when needed.
