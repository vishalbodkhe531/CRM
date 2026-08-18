# API Spec

## Base Contract

- Versioned API base path: `/api/v1`.
- Health endpoint: `GET /health`.
- Static uploaded assets: `GET /uploads/*`.
- JSON content type by default. File uploads use `multipart/form-data`.
- Success responses use `ApiResponse.ok` or `ApiResponse.created`.
- Error responses are produced by `errorHandler`.

## Auth And Security Headers

Protected routes require:

```bash
Authorization: Bearer <accessToken>
```

The access token is returned in auth JSON responses. The refresh token is an HTTP-only cookie named `refresh_token`, scoped to `/api/v1/auth`.

State-changing requests require one CSRF signal:

```bash
x-requested-with: XMLHttpRequest
```

or:

```bash
x-csrf-token: <non-empty-value>
```

CSRF exemptions:

- Safe methods: `GET`, `HEAD`, `OPTIONS`.
- `POST /api/v1/auth/login`.
- `GET /health`.
- Internal job routes, because they are mounted before CSRF middleware.

`POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout` are protected writes and must send the CSRF header.

## Organization Scope

Tenant-scoped routers mount `requireOrganization`.

- Non-super-admin users are scoped from `req.user.organizationId`.
- Super admin users must send `x-organization-id: <organizationId>` for tenant data routes.
- Organization scope is never accepted from query or body.

Tenant data modules with write subscription enforcement:

- `/users`
- `/items`
- `/leads`
- `/prospects`
- `/quotations`

Reads stay available when a subscription lapses. Writes return `402` with `SUBSCRIPTION_REQUIRED` when the subscription is read-only. Super admin writes are exempt.

## Response Shapes

Success:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

Error:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": 400,
  "errorCode": "VALIDATION_ERROR",
  "details": []
}
```

## Public And Auth Routes

### Auth: `/api/v1/auth`

| Method | Path | Middleware | Schema | Returns |
| --- | --- | --- | --- | --- |
| `POST` | `/signup` | `authLimiter` | `SignupSchema` | `{ user, accessToken }`, sets `refresh_token` |
| `POST` | `/login` | `authLimiter` | `LoginSchema` | `{ user, accessToken }`, sets `refresh_token` |
| `POST` | `/refresh` | `refreshLimiter` | refresh cookie | `{ accessToken }`, rotates `refresh_token` |
| `POST` | `/logout` | none | refresh cookie optional | `null`, clears cookie |
| `GET` | `/me` | `requireAuth` | none | `{ user }` |
| `PATCH` | `/profile` | `requireAuth`, multipart upload | `UpdateProfileSchema` | `{ user }` |
| `POST` | `/change-password` | `requireAuth` | `ChangePasswordSchema` | `null`, clears cookie |

Profile upload fields: `profileImage`, `companyLogo`, `qrCode`, `signature`.

### Signup Requests

| Method | Path | Middleware | Schema | Returns |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/signup-requests` | `authLimiter` | `SignupRequestSchema` | `SignupRequestResponse` |
| `GET` | `/api/v1/admin/signup-requests` | `requireAuth`, super admin | `SignupRequestListSchema` query | `SignupRequest[]` plus `meta` |
| `GET` | `/api/v1/admin/signup-requests/:id` | `requireAuth`, super admin | `id` param | `SignupRequest` |
| `PATCH` | `/api/v1/admin/signup-requests/:id/status` | `requireAuth`, super admin | `SignupRequestStatusUpdateSchema` | `SignupRequest` |

## Tenant Data Routes

### Users: `/api/v1/users`

Middleware: `requireAuth`, `requireOrganization`, `enforceSubscription`.

| Method | Path | Permission | Schema | Returns |
| --- | --- | --- | --- | --- |
| `POST` | `/` | `user:create` | `CreateUserSchema` | `User` |
| `GET` | `/` | `user:read` | `UserFilterSchema` query | `User[]` plus `meta` |
| `GET` | `/stats` | `user:read` | none | user stats |
| `GET` | `/:id` | `user:read` | `id` param | `User` |
| `PUT` | `/:id` | `user:update` | `UpdateUserSchema` | `User` |
| `POST` | `/:id/reset-password` | `user:update`, service enforces super admin | `id` param | `{ user, temporaryPassword }` |
| `PATCH` | `/:id/disable` | `user:disable` | `id` param | `User` |
| `PATCH` | `/:id/enable` | `user:enable` | `id` param | `User` |
| `DELETE` | `/:id` | `user:delete` | `id` param | `null` |

### Items: `/api/v1/items`

Middleware: `requireAuth`, `requireOrganization`, `enforceSubscription`.

| Method | Path | Permission | Schema | Returns |
| --- | --- | --- | --- | --- |
| `POST` | `/` | `item:create` | `CreateItemSchema` | `Item` |
| `GET` | `/stats` | `item:read` | none | item stats |
| `GET` | `/` | `item:read` | `ItemFilterSchema` query | `Item[]` plus `meta` |
| `GET` | `/:id` | `item:read` | `id` param | `Item` |
| `PATCH` | `/:id` | `item:update` | `UpdateItemSchema` | `Item` |
| `PATCH` | `/:id/toggle-status` | `item:update` | `id` param | `Item` |
| `DELETE` | `/:id` | `item:delete` | `id` param | `null` |

### Leads: `/api/v1/leads`

Middleware: `requireAuth`, `requireOrganization`, `enforceSubscription`.

| Method | Path | Permission | Schema | Returns |
| --- | --- | --- | --- | --- |
| `POST` | `/` | `lead:create` | multipart or JSON `CreateLeadSchema` | `Lead` |
| `POST` | `/import` | `lead:create` | multipart field `file` | `{ count }` |
| `GET` | `/assignable-users` | `lead:read` | none | user previews |
| `GET` | `/` | `lead:read` | `LeadFilterSchema` query | `Lead[]` plus `meta` |
| `GET` | `/:id` | `lead:read` | `id` param | `Lead` |
| `PATCH` | `/:id` | `lead:update` | multipart or JSON `UpdateLeadSchema` | `Lead` |
| `PATCH` | `/:id/status` | `lead:update` | `UpdateLeadStatusSchema` | `Lead` |
| `DELETE` | `/:id` | `lead:delete` | `id` param | `null` |
| `POST` | `/:id/convert` | `lead:update` | `ConvertLeadToProspectFromLeadSchema` | `Prospect` |
| `PATCH` | `/:id/assign` | `lead:update` | `AssignLeadSchema` | `Lead` |

Lead profile image upload field: `profilePicture`. Lead import upload field: `file`.

### Prospects: `/api/v1/prospects`

Middleware: `requireAuth`, `requireOrganization`, `enforceSubscription`.

| Method | Path | Permission | Schema | Returns |
| --- | --- | --- | --- | --- |
| `GET` | `/` | `prospect:read` | `ProspectFilterSchema` query | `Prospect[]` plus `meta` |
| `GET` | `/customer-stats` | `prospect:read` | none | customer stats |
| `GET` | `/:id` | `prospect:read` | `id` param | `Prospect` |
| `POST` | `/convert` | `prospect:create` | `ConvertLeadToProspectSchema` | `Prospect` |
| `PATCH` | `/:id` | `prospect:update` | `UpdateProspectSchema` | `Prospect` |
| `PATCH` | `/:id/stage` | `prospect:update` | `UpdateProspectStageSchema` | `Prospect` |
| `PATCH` | `/:id/follow-up` | `prospect:update` | `UpdateProspectFollowUpSchema` | `Prospect` |
| `POST` | `/:id/activities` | `prospect:update` | `CreateProspectActivitySchema` | `ProspectActivity` |
| `DELETE` | `/:id` | `prospect:delete` | `id` param | `null` |

### Quotations: `/api/v1/quotations`

Middleware: `requireAuth`, `requireOrganization`, `enforceSubscription`.

| Method | Path | Permission | Schema | Returns |
| --- | --- | --- | --- | --- |
| `POST` | `/` | `quotation:create` | `CreateQuotationSchema` | `Quotation` |
| `GET` | `/` | `quotation:read` | `QuotationFilterSchema` query | `Quotation[]` plus `meta` |
| `GET` | `/stats` | `quotation:read` | none | quotation stats |
| `GET` | `/:id` | `quotation:read` | `id` param | `Quotation` |
| `PATCH` | `/:id` | `quotation:update` | `UpdateQuotationSchema` | `Quotation` |
| `DELETE` | `/:id` | `quotation:delete` | `id` param | `null` |

## Platform And Shared Routes

### Organizations: `/api/v1/organizations`

Middleware: `requireAuth`. Most routes are super-admin/platform permissions.

| Method | Path | Permission | Schema | Returns |
| --- | --- | --- | --- | --- |
| `GET` | `/by-slug/:slug` | authenticated | `OrganizationSlugParamSchema` | `Organization` |
| `GET` | `/` | `org:list:global` | `OrganizationFilterSchema` query | `Organization[]` plus `meta` |
| `POST` | `/` | `org:create` | multipart `CreateOrganizationSchema` | `CreateOrganizationResult` |
| `GET` | `/:id` | `org:read` | `id` param | `Organization` |
| `PATCH` | `/:id` | `org:update` | multipart `UpdateOrganizationSchema` | `Organization` |
| `PATCH` | `/:id/status` | `org:update` | `{ status }` | `Organization` |
| `DELETE` | `/:id` | `org:delete` | `id` param | archived `Organization` |
| `PATCH` | `/:id/restore` | `org:delete` | `id` param | restored `Organization` |
| `GET` | `/:id/users` | `user:read` | `id` param | `User[]` |

Organization asset upload fields: `companyLogo`, `qrCode`, `signature`.

### Dashboard: `/api/v1/dashboard`

All routes mount `requireAuth` and `dashboard:read`.

| Method | Path | Scope | Returns |
| --- | --- | --- | --- |
| `GET` | `/super-admin` | super admin, not org-scoped | `SuperAdminStatsDTO` |
| `GET` | `/admin` | admin, org-scoped | `AdminStatsDTO` |
| `GET` | `/manager` | manager, org-scoped | `ManagerStatsDTO` |
| `GET` | `/executive` | executive, org-scoped | `ExecutiveStatsDTO` |

### Reports: `/api/v1/reports`

Middleware: `requireAuth`, `requireOrganization`, `reports:read`.

| Method | Path | Schema | Returns |
| --- | --- | --- | --- |
| `GET` | `/` | `ReportFilterSchema` query | report data envelope |
| `GET` | `/?exportType=lead` | `ReportFilterSchema` query | CSV |
| `GET` | `/?exportType=prospect` | `ReportFilterSchema` query | CSV |
| `GET` | `/?exportType=quotation` | `ReportFilterSchema` query | CSV |
| `GET` | `/?exportType=performance` | `ReportFilterSchema` query | CSV |

### Audit Logs: `/api/v1/audit-logs`

Middleware: `requireAuth`, `audit:read`, `requireFeature("AUDIT_LOG_ACCESS")`.

| Method | Path | Schema | Returns |
| --- | --- | --- | --- |
| `GET` | `/` | `AuditLogFilterSchema` query | `AuditLogEntry[]` plus `meta` |
| `GET` | `/export` | `AuditLogFilterSchema` query | CSV |

### Announcements: `/api/v1/announcements`

Middleware: `requireAuth`. Viewer routes are available to any authenticated user. Authoring routes also require `ANNOUNCEMENTS` feature and announcement permissions.

| Method | Path | Permission | Schema | Returns |
| --- | --- | --- | --- | --- |
| `GET` | `/feed` | authenticated | `AnnouncementFeedSchema` query | `AnnouncementFeedItem[]` plus feed meta |
| `POST` | `/read-all` | authenticated | none | receipt result |
| `POST` | `/:id/read` | authenticated | `id` param | receipt result |
| `POST` | `/:id/dismiss` | authenticated | `id` param | receipt result |
| `GET` | `/` | `announcement:read` | `AnnouncementFilterSchema` query | `AnnouncementListItem[]` plus `meta` |
| `POST` | `/` | `announcement:create` | `CreateAnnouncementSchema` | `AnnouncementListItem` |
| `GET` | `/:id` | `announcement:read` | `id` param | `AnnouncementListItem` |
| `PATCH` | `/:id` | `announcement:update` | `UpdateAnnouncementSchema` | `AnnouncementListItem` |
| `POST` | `/:id/publish` | `announcement:publish` | `id` param | `AnnouncementListItem` |
| `POST` | `/:id/archive` | `announcement:publish` | `id` param | `AnnouncementListItem` |
| `DELETE` | `/:id` | `announcement:delete` | `id` param | soft-deleted announcement |

### Billing: `/api/v1/billing`

Middleware: `requireAuth`. Billing deliberately does not mount subscription enforcement.

| Method | Path | Permission | Schema | Returns |
| --- | --- | --- | --- | --- |
| `GET` | `/plans` | `billing:read` | `PlanFilterSchema` query | `PlanSummary[]` plus `meta` |
| `POST` | `/plans` | `plan:manage` | `CreatePlanSchema` | `PlanSummary` |
| `PATCH` | `/plans/:id` | `plan:manage` | `UpdatePlanSchema` | `PlanSummary` |
| `GET` | `/subscriptions` | `billing:manage` | `SubscriptionFilterSchema` query | `SubscriptionSummary[]` plus `meta` |
| `GET` | `/unsubscribed-organizations` | `billing:manage` | none | organizations without subscriptions |
| `GET` | `/subscriptions/:organizationId` | `billing:manage` | `organizationId` param | `SubscriptionSummary` |
| `POST` | `/subscriptions/:organizationId` | `billing:manage` | `AssignInitialPlanSchema` | `SubscriptionSummary` |
| `PATCH` | `/subscriptions/:organizationId` | `billing:manage` | `UpdateSubscriptionSchema` | `SubscriptionSummary` |
| `PUT` | `/subscriptions/:organizationId/features` | `billing:manage` | `UpdateFeatureOverridesSchema` | `SubscriptionSummary` |
| `POST` | `/subscriptions/:organizationId/cancel` | `billing:manage` | `CancelSubscriptionSchema` | `SubscriptionSummary` |
| `GET` | `/subscription` | `billing:read`, org-scoped | none | caller org subscription |
| `GET` | `/subscription/status` | authenticated, org-scoped | none | safe subscription status |
| `GET` | `/usage` | `billing:read`, org-scoped | none | `BillingUsage` |

### Notifications: `/api/v1/notifications`

Middleware: `requireAuth`. Notification repository scopes by caller `userId`.

| Method | Path | Schema | Returns |
| --- | --- | --- | --- |
| `GET` | `/` | `NotificationFeedSchema` query | `NotificationItem[]` plus feed meta |
| `PATCH` | `/read-all` | none | `{ unreadCount }` |
| `PATCH` | `/:id/read` | `id` param | `{ unreadCount }` |
| `DELETE` | `/:id` | `id` param | `{ unreadCount }` |

### Platform Settings: `/api/v1/platform-settings`

Middleware: `requireAuth`. No tenant scoping.

| Method | Path | Permission | Schema | Returns |
| --- | --- | --- | --- | --- |
| `GET` | `/public` | authenticated | none | `PublicPlatformSettings` |
| `GET` | `/` | `platform:manage` | none | `PlatformSettings` |
| `PATCH` | `/` | `platform:manage` | `UpdatePlatformSettingsSchema` | `PlatformSettings` |

### Internal Jobs: `/api/v1/internal`

Mounted before CSRF and rate limiting. Requires `x-internal-secret` matching `INTERNAL_JOB_SECRET`.

| Method | Path | Schema | Returns |
| --- | --- | --- | --- |
| `GET` | `/jobs` | none | `{ jobs }` |
| `POST` | `/jobs/run` | `RunJobsSchema` | job run summary |

## Common Query Parameters

Paginated list schemas generally accept:

```ts
{
  page?: number;
  limit?: number;
  search?: string;
}
```

Feature-specific filters live in `backend/src/contracts/validation/*.schemas.ts` and are shared into the frontend contracts.

## Notable Lifecycle Rules

- Lead status values: `NEW`, `ATTEMPTED_CONTACT`, `CONTACTED`, `QUALIFIED`, `UNQUALIFIED`.
- Lead conversion requires a qualified lead and produces or returns a `Prospect`.
- Prospect stages: `REQUIREMENT`, `FOLLOW_UP`, `DEMO`, `PROPOSAL`, `NEGOTIATION`, `WON`, `LOST`.
- Quotations use optimistic versioning through `expectedVersion` in `UpdateQuotationSchema`.
- Billing feature overrides use `PUT` because the request replaces the complete override set.
