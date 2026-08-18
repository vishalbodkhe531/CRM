# Implementation Plan — Announcements / Broadcast, Notifications, and Billing / Subscriptions

**Status:** Draft for review
**Audience:** Implementing developer (junior) + tech lead
**Written against:** `dev` @ `4d9637e`

---

## 0. What this covers

Three related gaps in the product today:

| # | Gap | Current state |
|---|-----|---------------|
| A | **Announcements / broadcast** | Nothing exists. No notification model, no bell, no banner. |
| B | **Per-user notifications** | Nothing exists. Follow-up reminders are stored (`Prospect.followUpDate`, `Prospect.followUpReminder`) but nobody is ever notified. |
| C | **Billing / plans / subscription** | `Organization` has no `plan`, `seatLimit`, `trialEndsAt`, or usage fields. There is no `Plan`, no `Subscription`, no enforcement anywhere. |

They are planned together because they share the same substrate (a bell in the header, a banner in the layout, a `Role`-aware visibility query) and because **C produces the messages that A delivers** ("your trial ends in 3 days", "you are at your seat limit").

**Build order is A → C → B.** A is self-contained and ships user-visible value fastest; C is the schema decision that must be settled before more org-level features pile up; B is the largest and depends on a job runner we do not have yet (see §5).

---

## 1. BLOCKING decisions for the lead — settle these before writing code

> **ANSWERED 2026-07-22.** Recorded here so Part C does not re-litigate them:
>
> | | Decision | Answer |
> |---|---|---|
> | D1 | Sold as SaaS? | **Yes** |
> | D2 | Billing operation | **Gateway-ready now (Razorpay/Stripe)** — *differs from the recommendation below; see the note in §C2* |
> | D3 | Lapse behaviour | **Read-only after a 7-day grace period** (as recommended) |
> | D4 | Limits | **Enforce seats only in v1**, report the rest |
> | D5 | Announcement authoring | **Super-admin + org admin**, two scopes (as recommended) |
> | D6 | Currency scope | **Single-currency INR.** One `priceMinor` per plan; no per-currency pricing rows |
>
> **Build scope for the current pass: Part A only.** Part C is specified but not yet implemented.
>
> **Part A implementation status (2026-07-22): code complete, migration pending.**
> Backend and frontend both typecheck and lint clean. What shipped:
>
> - `backend/prisma/models/announcement.prisma` + migration `20260722140000_add_announcements` (**written, NOT yet applied** — see §A11)
> - `backend/src/modules/announcement/` — route, controller, service, repository
> - contracts in **both** trees; five new permissions; five new audit actions
> - `frontend/src/features/announcements/` — bell, banner, management console
> - `backend/src/scripts/verifyAnnouncementVisibility.ts` — the §A3 matrix as a runnable harness
>
> Deviations from the plan as written are recorded in §A11.

Everything else in this doc is written against the **recommended** answer so the plan stays actionable, but a different answer changes the schema.

### D1. Is this actually being sold as SaaS?

- **If yes** → build Part C as specified.
- **If no** (single-tenant / per-deployment licensing, or orgs are internal business units) → **do not build Part C at all**. Add nothing to `Organization`. Revisit when a commercial model exists.

> **Recommendation:** the codebase already carries the shape of a SaaS (`Organization.slug`, `prefix`, per-org sequences, `x-organization-id` scoping, super-admin tenant workspace). Assume yes.

### D2. Self-serve payment, or super-admin-managed?

- **Option 1 (recommended for v1): super-admin managed.** Super-admin assigns a plan to an org, sets the period, marks it paid. Money is collected offline (bank transfer / manual invoice — consistent with the existing GSTIN + QR-code + signature fields on `Organization`, which point at manual Indian invoicing).
- Option 2: payment gateway (Razorpay for INR, Stripe for USD) with webhooks.

> **Recommendation: Option 1.** There is no gateway dependency in `backend/package.json`, no webhook route, no idempotency infrastructure, and no PCI/refund policy. The schema in §4 reserves `externalCustomerId` / `externalSubscriptionId` so Option 2 is a later additive migration, not a rewrite.

### D3. What actually happens when a subscription lapses?

This is a product decision, not a technical one. Proposed default in §4.5:

| Effective status | Behaviour |
|---|---|
| `TRIALING`, `ACTIVE` | Full access. |
| `PAST_DUE` (grace period, default 7 days) | Full access + persistent warning banner. |
| `EXPIRED`, `CANCELLED` | **Read-only.** All GET routes work; every POST/PATCH/DELETE on tenant data returns `402`. `ADMIN` can still reach billing + profile so they can pay. |
| Org `SUSPENDED` (existing manual flag) | Unchanged — hard lockout at `requireAuth`, as today. |

**Never hard-lock on lapse.** A tenant that cannot log in cannot see the invoice, cannot export their data, and will charge back.

### D4. Are plan limits enforced, or only reported?

> **Recommendation: enforce seats only in v1** (`seatLimit`), report the rest (leads/quotations/storage) on a usage screen. Enforcing five limits at once means five new failure paths in five modules; seats is one, in `userService.createUser`.

### D5. Does an org admin get to write announcements, or only super-admin?

> **Recommendation: both**, with two scopes (`PLATFORM` for super-admin, `ORGANIZATION` for admin). It costs one enum and one `WHERE` clause now, versus a migration later.

---

## 2. Ground rules the implementer must follow

These are existing conventions in this repo. Deviating from them is the main way this ticket goes wrong.

**Backend** (see [backend/docs/coding-guidelines.md](backend/docs/coding-guidelines.md)):

1. Layering is strict: **route → controller → service → repository**. Prisma calls live *only* in repositories. Business rules and authorization live *only* in services. Controllers are HTTP glue.
2. **Services must not import other services.** The one exception in the codebase is audit, and even that goes through [recordAudit.ts](backend/src/utils/audit/recordAudit.ts) called from the *controller*, after the service returns.
3. Every response goes through `ApiResponse.ok` / `ApiResponse.created`. Every failure throws `AppError.*`. No ad-hoc JSON.
4. Org scope comes from `req.organizationId` (set by `requireOrganization`) — **never** from query or body.
5. New Prisma models go in their own file under [backend/prisma/models/](backend/prisma/models/), matching `audit_log.prisma` / `organization.prisma`.
6. Audit-worthy actions get a new entry in [audit.constants.ts](backend/src/contracts/constants/audit.constants.ts) **first**, then a `recordAudit(...)` call in the controller.

**Frontend** (see [frontend/docs/architecture.md](frontend/docs/architecture.md)):

7. Feature folder layout is fixed: `features/<name>/{api,components,constants,hooks,types,index.ts}`. Copy [features/audit/](frontend/src/features/audit/) verbatim as the skeleton — it is the newest and cleanest module.
8. All query keys go in [lib/queryKeys.ts](frontend/src/lib/queryKeys.ts) and **must include `selectedOrgId`** in the key, or a super-admin switching tenants will read a stale cache.
9. Routes go in [AppRoutes.tsx](frontend/src/components/routing/AppRoutes.tsx) — and remember there are **two** blocks: the `/:orgSlug/...` nested block and the flat `/...` block. Add to both.
10. Sidebar entries go in [sidebarConfig.ts](frontend/src/components/layout/sidebar/sidebarConfig.ts) with a role list from [constants/roles.ts](frontend/src/constants/roles.ts).

**Contracts** ⚠️ **read this twice:**

11. `backend/src/contracts/` and `frontend/src/contracts/` are **hand-mirrored copies**, not a shared package. Every type/enum/constant you add must be written into **both** trees, identically. Nothing enforces this — a mismatch compiles fine and breaks at runtime. Add the backend file, then immediately copy it across.

---

# PART A — Announcements / Broadcast

## A1. Feature definition

An **announcement** is authored content pushed to many users at once. It is *not* a per-user event notification (that's Part B).

Two scopes:
- **`PLATFORM`** — written by `SUPER_ADMIN`. Targets all organizations, or an explicit list. "Scheduled maintenance Sunday 2am."
- **`ORGANIZATION`** — written by an `ADMIN`. Visible only inside their own org. "Q3 targets are published."

Three delivery surfaces:
- **Bell** — dropdown in the header, with unread count.
- **Banner** — full-width strip at the top of `DashboardLayout`, for `CRITICAL` only.
- Management list — the authoring CRUD screen.

## A2. Schema

New file: `backend/prisma/models/announcement.prisma`

```prisma
enum AnnouncementScope {
  /// Authored by super-admin. Crosses tenants.
  PLATFORM
  /// Authored by an org admin. Confined to that org.
  ORGANIZATION
}

enum AnnouncementSeverity {
  INFO
  WARNING
  CRITICAL
}

enum AnnouncementStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
  ARCHIVED
}

enum AnnouncementPlacement {
  BANNER
  BELL
  BOTH
}

model Announcement {
  id String @id @default(uuid())

  title String
  /// Plain text. Rendered with {body} in JSX — NEVER dangerouslySetInnerHTML.
  /// An org admin can author this; treating it as HTML is stored XSS across the tenant.
  body String

  severity  AnnouncementSeverity  @default(INFO)
  placement AnnouncementPlacement @default(BELL)
  scope     AnnouncementScope
  status    AnnouncementStatus    @default(DRAFT)

  /// The AUTHOR's organization. Null for PLATFORM announcements.
  /// Do not confuse with targetOrganizationIds, which is the audience.
  organizationId String?
  organization   Organization? @relation("OrganizationAnnouncements", fields: [organizationId], references: [id], onDelete: Cascade)

  /// PLATFORM only. Empty = every organization. Non-empty = only these ids.
  /// A plain String[] rather than a join table: the audience is a snapshot of
  /// intent at publish time, never queried from the other direction.
  targetOrganizationIds String[] @default([])

  /// Empty = every role in scope. Non-empty = only these roles.
  targetRoles Role[] @default([])

  /// Null publishAt on a PUBLISHED row means "live immediately".
  /// There is no scheduler in this app (see §5) — SCHEDULED rows become visible
  /// because the feed query compares publishAt to now(), not because a job flips them.
  publishAt DateTime?
  expiresAt DateTime?

  dismissible Boolean @default(true)

  createdById String?
  createdBy   User?   @relation("AnnouncementCreator", fields: [createdById], references: [id], onDelete: SetNull)

  /// Soft delete, same pattern as User.deletedAt / Organization.deletedAt.
  deletedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  receipts AnnouncementReceipt[]

  @@index([status, scope, publishAt])
  @@index([organizationId, status])
  @@index([expiresAt])
  @@index([deletedAt])
}

/// Per-user read/dismiss state.
///
/// Rows are created LAZILY — the first time a given user reads or dismisses a
/// given announcement. Absence of a row means "unread". Do NOT fan out at publish
/// time: one platform broadcast would write a row for every user of every tenant,
/// and re-targeting an announcement would have to reconcile them.
model AnnouncementReceipt {
  id String @id @default(uuid())

  announcementId String
  announcement   Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)

  userId String
  user   User   @relation("AnnouncementReceipts", fields: [userId], references: [id], onDelete: Cascade)

  readAt      DateTime?
  dismissedAt DateTime?

  @@unique([announcementId, userId])
  @@index([userId, dismissedAt])
}
```

Add the back-relations:

```prisma
// organization.prisma → model Organization
announcements Announcement[] @relation("OrganizationAnnouncements")

// user.prisma → model User
announcementsCreated  Announcement[]        @relation("AnnouncementCreator")
announcementReceipts  AnnouncementReceipt[] @relation("AnnouncementReceipts")
```

Migration: `npx prisma migrate dev --name add_announcements`. Purely additive, no data backfill.

## A3. The visibility query — the heart of the feature

Get this right and everything else is CRUD. Put it in `announcement.repository.ts` as an exported builder so the feed list and the unread count cannot drift apart.

```ts
type AnnouncementViewer = {
  id: string;
  role: Role;
  organizationId: string | null;
};

/**
 * Rows a given user is entitled to see right now.
 *
 * Scheduling and expiry are evaluated here rather than by a job, so `now` must
 * be passed in by the caller and reused across the list and count queries in one
 * request — otherwise a row can straddle the boundary and the badge disagrees
 * with the list.
 */
export const buildVisibilityWhere = (
  viewer: AnnouncementViewer,
  now: Date,
): Prisma.AnnouncementWhereInput => {
  const audience: Prisma.AnnouncementWhereInput[] = [
    // Platform broadcast to everyone.
    { scope: "PLATFORM", targetOrganizationIds: { isEmpty: true } },
  ];

  if (viewer.organizationId) {
    audience.push(
      // Platform broadcast explicitly targeting this org.
      { scope: "PLATFORM", targetOrganizationIds: { has: viewer.organizationId } },
      // The org's own announcements.
      { scope: "ORGANIZATION", organizationId: viewer.organizationId },
    );
  }

  return {
    deletedAt: null,
    status: AnnouncementStatus.PUBLISHED,
    AND: [
      { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      { OR: [{ targetRoles: { isEmpty: true } }, { targetRoles: { has: viewer.role } }] },
      { OR: audience },
    ],
  };
};
```

Unread count, layered on top:

```ts
const unreadWhere = {
  ...buildVisibilityWhere(viewer, now),
  receipts: { none: { userId: viewer.id, readAt: { not: null } } },
};
```

Dismissed rows drop out of the *bell list* (`receipts: { none: { userId, dismissedAt: { not: null } } }`) but a non-`dismissible` `CRITICAL` banner ignores dismissal entirely — that is the point of the flag.

**Test matrix for this function** (write these before the UI exists — see A8):

| Viewer | Announcement | Visible? |
|---|---|---|
| ADMIN @ Org A | PLATFORM, targets `[]` | ✅ |
| ADMIN @ Org A | PLATFORM, targets `[OrgB]` | ❌ |
| ADMIN @ Org A | ORGANIZATION @ Org B | ❌ |
| EXECUTIVE @ Org A | ORGANIZATION @ Org A, roles `[ADMIN]` | ❌ |
| EXECUTIVE @ Org A | ORGANIZATION @ Org A, roles `[]` | ✅ |
| any | PUBLISHED, `publishAt` = tomorrow | ❌ |
| any | PUBLISHED, `expiresAt` = yesterday | ❌ |
| any | DRAFT | ❌ |
| SUPER_ADMIN (`organizationId` null) | ORGANIZATION @ Org A | ❌ via feed |

That last row is deliberate: super-admin reads *every* announcement through the management list, not through their own feed. Do not special-case super-admin inside `buildVisibilityWhere` — it makes the function untestable.

## A4. Contracts

`backend/src/contracts/constants/announcement.constants.ts` — **and the mirror copy in `frontend/src/contracts/constants/`**:

```ts
export const ANNOUNCEMENT_SCOPES = ["PLATFORM", "ORGANIZATION"] as const;
export const ANNOUNCEMENT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
export const ANNOUNCEMENT_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export const ANNOUNCEMENT_PLACEMENTS = ["BANNER", "BELL", "BOTH"] as const;

/** Bell dropdown fetch size. The full history lives behind "View all". */
export const ANNOUNCEMENT_FEED_PREVIEW_LIMIT = 10;
```

`contracts/types/announcement.types.ts`:

```ts
export interface AnnouncementListItem {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  placement: AnnouncementPlacement;
  scope: AnnouncementScope;
  status: AnnouncementStatus;
  publishAt: string | null;
  expiresAt: string | null;
  dismissible: boolean;
  organizationId: string | null;
  organizationName: string | null;
  targetOrganizationIds: string[];
  targetRoles: string[];
  createdBy: { id: string | null; name: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

/** Feed shape = list item + this viewer's receipt state. */
export interface AnnouncementFeedItem extends AnnouncementListItem {
  read: boolean;
  dismissed: boolean;
}

export interface AnnouncementFeedMeta {
  unreadCount: number;
}
```

`contracts/validation/announcement.schemas.ts` — `CreateAnnouncementSchema`, `UpdateAnnouncementSchema`, `AnnouncementFilterSchema`, `AnnouncementFeedSchema`. Copy the query-array preprocessing helper from [audit.schemas.ts](backend/src/contracts/validation/audit.schemas.ts) rather than re-inventing it.

Cross-field rules that belong in `.refine()`, not in the service:
- `expiresAt > publishAt` when both present.
- `targetOrganizationIds` non-empty ⇒ `scope === "PLATFORM"`.
- `severity === "CRITICAL"` ⇒ `placement` includes banner (`BANNER` or `BOTH`). Otherwise a critical notice hides in a dropdown.

## A5. Backend module — `backend/src/modules/announcement/`

Four files, mirroring the audit module: `announcement.route.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`.

### Routes

```
router.use(requireAuth);

// --- Viewer surface (any authenticated user, no extra permission) ---
GET   /announcements/feed             → my visible announcements + unreadCount
POST  /announcements/read-all         → mark every currently-visible one read
POST  /announcements/:id/read
POST  /announcements/:id/dismiss

// --- Authoring surface ---
GET    /announcements                 → ANNOUNCEMENT_READ    (management list)
POST   /announcements                 → ANNOUNCEMENT_CREATE
GET    /announcements/:id             → ANNOUNCEMENT_READ
PATCH  /announcements/:id             → ANNOUNCEMENT_UPDATE
POST   /announcements/:id/publish     → ANNOUNCEMENT_PUBLISH
POST   /announcements/:id/archive     → ANNOUNCEMENT_PUBLISH
DELETE /announcements/:id             → ANNOUNCEMENT_DELETE   (soft)
```

⚠️ **Express matches in declaration order.** `/feed` and `/read-all` must be declared **above** `/:id`, or `GET /announcements/feed` resolves as `GET /:id` with `id="feed"` and returns a 404 that looks like a data bug.

Register in [app.ts](backend/src/app.ts): `app.use("/api/v1/announcements", announcementRoutes);`

No `requireOrganization` on this router — same reasoning as the audit module. Super-admin authors unscoped; scoping is enforced inside the service.

### Service rules

`createAnnouncement(input, actor)`:
- `SUPER_ADMIN` → may set `scope: PLATFORM`; `organizationId` stays null; may set `targetOrganizationIds`.
- `ADMIN` → forced to `scope: ORGANIZATION` and `organizationId = actor.organizationId`. If the payload asks for `PLATFORM` or sets `targetOrganizationIds`, **throw 403 — do not silently downgrade.** A silent downgrade means an admin believes they broadcast platform-wide and did not.
- Everyone else → 403 (already blocked by permission, but assert in the service too; guidelines rule #4 in §2).
- Validate every id in `targetOrganizationIds` exists — an unknown id silently narrows the audience to nothing.

`updateAnnouncement`:
- A `PUBLISHED` announcement is **editable in place** (typo fixes) but changing `scope`, `targetOrganizationIds`, or `targetRoles` after publish is rejected with 409. Re-targeting a live announcement retroactively changes who "already saw" it.
- Non-super-admin may only touch rows where `organizationId === actor.organizationId`. Throw 403, do not return 404 — consistent with `auditService.getAuditLogs`, which rejects rather than returning an empty list.

`publishAnnouncement`: `DRAFT | SCHEDULED → PUBLISHED`. If `publishAt` is in the future, keep the row `PUBLISHED` (the feed query handles the timing) but surface the status as `SCHEDULED` in the management list via a derived field. Simpler alternative if the lead prefers: forbid publishing with a future `publishAt` and require `status: SCHEDULED` + a `publishAt`; the feed query treats `SCHEDULED` and `PUBLISHED` identically. **Pick one and write it in the file header comment** — this is the single most likely source of confusion later.

`markRead(id, userId)` / `dismiss(id, userId)`:
- Must verify the announcement is *visible to that user* before writing a receipt, otherwise any authenticated user can create receipts for other tenants' announcements by guessing uuids. Reuse `buildVisibilityWhere`.
- Use `upsert` on the `@@unique([announcementId, userId])` — two rapid clicks otherwise race into a unique-constraint 500.

`markAllRead(userId)`: `createMany({ skipDuplicates: true })` over the currently-visible ids, then `updateMany` to set `readAt` on those that existed with a null `readAt`. Cap at a sane number of ids per call.

### Audit integration

Add to [audit.constants.ts](backend/src/contracts/constants/audit.constants.ts) (both trees):

```ts
"ANNOUNCEMENT_CREATED",
"ANNOUNCEMENT_UPDATED",
"ANNOUNCEMENT_PUBLISHED",
"ANNOUNCEMENT_ARCHIVED",
"ANNOUNCEMENT_DELETED",
```
and `"ANNOUNCEMENT"` to `AUDIT_ENTITY_TYPES`.

Call `recordAudit(req, {...})` from the **controller**, after the service returns, using `pickFields()` for the snapshot — never spread the entity (see the comment in [audit.service.ts](backend/src/modules/audit/audit.service.ts#L44-L49)).

Do **not** audit read/dismiss. It is per-user noise that would swamp the audit table.

### Permissions

[backend/src/constants/permissions.ts](backend/src/constants/permissions.ts):

```ts
// Announcements
ANNOUNCEMENT_CREATE: "announcement:create",
ANNOUNCEMENT_READ: "announcement:read",
ANNOUNCEMENT_UPDATE: "announcement:update",
ANNOUNCEMENT_DELETE: "announcement:delete",
ANNOUNCEMENT_PUBLISH: "announcement:publish",
```

[rolePermissions.ts](backend/src/constants/rolePermissions.ts): grant all five to `ADMIN` (scoped to own org in the service). `SUPER_ADMIN` gets them automatically via `Object.values(PERMISSIONS)`. `MANAGER` / `EXECUTIVE` get none — they read the feed, which needs no permission.

## A6. Frontend — `frontend/src/features/announcements/`

```
features/announcements/
├── api/
│   ├── endpoints.ts
│   └── services.ts
├── components/
│   ├── bell/
│   │   ├── AnnouncementBell.tsx        // trigger + unread badge
│   │   └── AnnouncementFeedList.tsx    // dropdown contents
│   ├── banner/
│   │   └── AnnouncementBanner.tsx      // CRITICAL strip
│   ├── form/
│   │   └── AnnouncementFormDialog.tsx  // create/edit
│   ├── table/
│   │   ├── AnnouncementTable.tsx
│   │   └── announcement.columns.tsx
│   └── view/
│       └── AnnouncementsView.tsx       // management page
├── constants/
│   ├── filters.ts
│   └── labels.ts
├── hooks/
│   ├── useAnnouncementFeed.ts
│   ├── useAnnouncements.ts
│   └── useAnnouncementMutations.ts
├── types/index.ts
└── index.ts
```

Query keys in [lib/queryKeys.ts](frontend/src/lib/queryKeys.ts):

```ts
announcements: {
  all: ["announcements"] as const,
  listScope: ["announcements", "list"] as const,
  list: (params?: AnnouncementListParams, orgId?: string | null) =>
    ["announcements", "list", params ?? null, orgId ?? null] as const,
  detail: (id: string, orgId?: string | null) =>
    ["announcements", "detail", id, orgId ?? null] as const,
  /** Viewer feed. Keyed by user, not org — a super-admin's own feed does not
   *  change when they scope into a tenant workspace. */
  feed: (userId?: string | null) => ["announcements", "feed", userId ?? null] as const,
},
```

**Mounting points:**
- Bell → [MobileHeader.tsx](frontend/src/components/layout/MobileHeader.tsx). The desktop layout currently has **no header bar** — [DashboardLayout.tsx](frontend/src/components/layout/DashboardLayout.tsx) renders `MobileHeader` then `<main>`. You will need a slim desktop header, or place the bell in [SidebarFooter.tsx](frontend/src/components/layout/sidebar/SidebarFooter.tsx) next to the user menu. **Confirm with the designer before building** — this is a layout change, not just a component.
- Banner → inside `DashboardLayout`, directly above `<main>`, so it survives route changes.
- Management page → new `pages/AnnouncementsPage.tsx` rendering `<AnnouncementsView />`, wired into **both** route blocks in `AppRoutes.tsx` at `announcements` / `/announcements`, guarded by a new `ANNOUNCEMENTS_ROUTE_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN]` in [constants/roles.ts](frontend/src/constants/roles.ts).
- Sidebar entry → `sidebarConfig.ts`, `Megaphone` icon from lucide, same roles.

**Polling:** the feed hook uses `refetchInterval: 60_000` and `refetchOnWindowFocus: true`. No websockets. A minute of latency on an announcement is fine; a socket layer is not in scope and there is nothing else in the app that would use it.

**Optimistic updates:** on read/dismiss, `setQueryData` on the feed key immediately, then invalidate on settle. The badge must not lag a click.

**Rendering `body`:** plain text in JSX. If the lead wants rich text, that is a separate ticket with a sanitizer dependency — flag it, do not improvise with `dangerouslySetInnerHTML`.

## A7. Acceptance criteria — Part A

- [ ] Super-admin creates a `PLATFORM` announcement targeting all orgs; a `MANAGER` in any active org sees it in the bell within 60s.
- [ ] Super-admin targets `[Org A]`; a user in Org B never sees it, and cannot fetch it by id.
- [ ] Admin in Org A creates an `ORGANIZATION` announcement; nobody in Org B sees it; the admin cannot create a `PLATFORM` one (403).
- [ ] Role targeting works: `targetRoles: [EXECUTIVE]` is invisible to `MANAGER`.
- [ ] `publishAt` in the future → not visible; after the timestamp passes → visible with no job run.
- [ ] `expiresAt` in the past → not visible.
- [ ] Unread badge matches the list count exactly; drops to 0 after "mark all read"; survives a reload.
- [ ] Dismiss removes it from the bell permanently for that user only.
- [ ] `CRITICAL` + non-dismissible renders a banner that cannot be closed.
- [ ] Create/update/publish/archive/delete each write exactly one audit row; read/dismiss write none.
- [ ] `POST /announcements/:id/read` for an announcement outside the caller's audience returns 403 and creates no receipt.

## A8. Test-first note

There is no test runner in `backend/package.json`. Do not let that turn into "no verification": write the `buildVisibilityWhere` matrix from §A3 as a throwaway script under `backend/src/scripts/` that seeds two orgs, six announcements, and prints a pass/fail table. Run it before opening the PR, attach the output. If the lead wants to add vitest, that is a separate ticket — raise it, do not bundle it.

## A11. What actually shipped — deviations and notes

Recorded at implementation time so a reviewer does not have to diff the plan against the code.

**Decisions the plan left open, now settled:**

1. **Publish vs. schedule (§A5 asked for a choice).** Chosen: publishing always sets `status = PUBLISHED`, even with a future `publishAt`. The feed query alone decides when a row starts being visible; the console reports "Not yet live" from a derived `isLive` field the backend computes. The `SCHEDULED` enum value exists in the schema but is not written by any code path — it is reserved so a future explicit-scheduling workflow does not need a migration. This keeps exactly one place (`buildVisibilityWhere`) that knows the timing rules.
2. **Bell placement (§A6 flagged this for the designer).** The desktop layout still has no header bar, so the bell was mounted in **two** places rather than restructuring `DashboardLayout`: `MobileHeader` (mobile, `lg:hidden`) and `SidebarFooter` above the user menu (desktop, `hidden lg:flex`). No layout change was made. **Still worth a designer's opinion** — the sidebar-footer position is functional but not obvious.
3. **Super-admin authoring `ORGANIZATION` scope is rejected** with a 400. A super-admin has no `organizationId`, so such a row would have no owning org and would be visible to nobody. Better a clear error than a silent no-op broadcast.
4. **Dismiss implies read.** Dismissing sets both `readAt` and `dismissedAt`. Otherwise a dismissed announcement stays in the unread count forever with no UI left to clear it.

**Extra hardening not in the original plan:**

- `markAllRead` is capped at `ANNOUNCEMENT_MARK_ALL_READ_LIMIT` (200) so one click cannot become an unbounded insert.
- The management list restricts an org admin to `scope = ORGANIZATION` **and** their own `organizationId` — an admin reads platform announcements in their bell but cannot manage them.
- Audience fields (`scope`, `targetOrganizationIds`, `targetRoles`) are frozen once published (409). The form disables those controls too, so the user finds out before typing rather than after saving.
- `CRITICAL` severity forces a banner placement on both sides — schema `.refine()` and a form effect — so a critical notice cannot hide in a dropdown.

**Unrelated bug found and fixed:** `prisma.config.ts` pointed the CLI at `DATABASE_URL`, which is the Supabase **pooler** (pgbouncer, transaction mode, port 6543). That cannot hold the session-level advisory lock `prisma migrate` takes, so **every migrate command hung indefinitely** rather than failing. It now uses `DIRECT_URL`. This is CLI-only: the runtime client builds its own pool from `DATABASE_URL` in `src/config/db.ts` and never reads that file. If anyone on the team has been avoiding `prisma migrate` because "it hangs", this is why.

**Verification performed:**

- `tsc --noEmit` clean on backend; `tsc -b --noEmit` and `eslint` clean on frontend.
- Migration `20260722140000_add_announcements` applied to the dev database.
- `npx tsx src/scripts/verifyAnnouncementVisibility.ts` → **17/17 passed** against the real database, fixture rolled back with no leftovers.
- Boot check: `/announcements/feed` and `/announcements` return 401 (not 404), confirming the router registers and `/feed` is not swallowed by `/:id`.

**Not yet verified — needs a human with a browser** (the §A7 checklist items that need real sessions):

- the bell badge count and its behaviour across two logged-in users;
- optimistic read/dismiss and the 60s poll;
- the banner rendering for `CRITICAL` + non-dismissible;
- that create/publish/archive/delete each write exactly one audit row, and read/dismiss write none.

---

# PART B — Per-user notifications (deferred, scoped here for completeness)

Announcements are broadcast. Notifications are per-user events: "your follow-up with Acme is due in 1 hour", "a lead was assigned to you", "your quotation was approved".

**Do not build this in the same sprint as Part A.** It is listed so the bell component is built generic from day one.

Sketch:

```prisma
model Notification {
  id String @id @default(uuid())

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  /// String, not an enum — same reasoning as AuditLog.action. Constrained by a
  /// union in contracts/types/notification.types.ts.
  type  String
  title String
  body  String

  /// Deep-link target: entityType + entityId → the frontend resolves the route.
  entityType String?
  entityId   String?

  readAt DateTime?

  createdAt DateTime @default(now())

  @@index([userId, readAt, createdAt])
  @@index([organizationId, createdAt])
}
```

**Hard blocker:** reminder notifications need a scheduler, and this app has none — no `node-cron`, no BullMQ, no worker process ([backend/package.json](backend/package.json)). Options, cheapest first:

1. **Compute-on-read** — no rows; derive "due follow-ups" from `Prospect.followUpDate` when the bell is opened. Works for reminders, cannot do email, cannot notify someone who never opens the app.
2. **`node-cron` inside the API process** — one line of setup, but fires once per instance; breaks the moment the API is scaled to two replicas.
3. **Platform cron hitting an internal endpoint** (Render Cron Job / GitHub Actions → `POST /internal/jobs/reminders` behind a shared secret) — correct for a single-region deploy, ~half a day of work.
4. BullMQ + Redis + a worker dyno — correct, and overkill for the current stage.

> **Recommendation: option 3.** Raise it with the lead as its own ticket. Option 1 is an acceptable v0 if the bell is the only surface.

The bell UI from Part A should therefore render a **merged feed** — announcements and notifications sorted by date into one list — so adding Part B is a new data source, not a new UI. Build `AnnouncementFeedList` against a `FeedItem` union type from the start.

---

# PART C — Billing, Plans, Subscriptions

## C1. The schema decision

**Do not put `plan`, `seatLimit`, `trialEndsAt` as columns on `Organization`.** They look like org attributes and they are not — they are attributes of a *commercial agreement* that has a lifecycle (trial → active → past due → renewed on a different plan) independent of the org. Flattening them onto `Organization` means:

- no plan history — you cannot answer "what were they paying in March?";
- no way to represent "cancelled, access until period end";
- every plan price change silently rewrites what existing tenants agreed to;
- `Organization` becomes the god-table every module already touches.

Three models instead: **`Plan`** (the catalogue), **`Subscription`** (org ↔ plan, one live row per org), and later **`Invoice`**. `Organization` gains **one** back-relation and nothing else.

## C2. Schema

> ⚠️ **D2 was answered "gateway-ready now", not the recommended "super-admin managed".** The models below are still correct and still the starting point, but a gateway needs more than the two reserved `external*` columns. Budget for these additions when Part C is scheduled — they are **not** costed into the ~13d estimate in §3, add roughly 5–7d:
>
> - a **`WebhookEvent`** table keyed on the provider's event id with a unique constraint, so a redelivered webhook is a no-op — gateways retry, and a duplicate `SUBSCRIPTION_RENEWED` double-extends a period;
> - an **`Invoice`** + **`PaymentAttempt`** pair, promoted out of "phase 3" — with a gateway, payment history is no longer optional;
> - a **raw-body** route mounted **before** `express.json()` in [app.ts](backend/src/app.ts), because signature verification hashes the unparsed body — the current parser at line 82 destroys it;
> - the webhook route must bypass `csrfProtection` and `apiLimiter` (gateways don't send CSRF headers and retry storms look like rate abuse);
> - `resolveSubscriptionState` (§C3) stays regardless — a webhook can be late or lost, so the clock remains the source of truth for access, with the gateway as the source of truth for *money*. Do not let webhook state be the only thing gating access.
>
> **Currency: single-currency INR (D6).** The `Plan` model below is therefore correct as written — one `priceMinor` per plan, `currency` a fixed `"INR"` default. No per-currency pricing table. Two consequences worth writing down now:
>
> - **Razorpay, not Stripe.** Stripe's India support requires an entity that can settle in INR and is a poor fit for domestic-only collection; Razorpay is the default choice and matches the existing GSTIN/QR/signature fields. Decide the provider before C-1 — it determines the webhook payload shape and the `external*` column semantics.
> - **Keep the `currency` column even though it is always `"INR"`.** Dropping it saves nothing and adding it back later means touching every historical `Invoice` row with a guess about what currency it was in. A column that is constant today is cheap; a missing one is a data-archaeology problem.
>
> If the business later sells outside India, the migration is additive: a `PlanPrice` child table keyed on `(planId, currency)`, with `Plan.priceMinor` retained as the INR default until backfilled. Nothing in the enforcement path (§C3, §C4) reads price, so that change stays confined to the billing module.

New file: `backend/prisma/models/billing.prisma`

```prisma
enum PlanInterval {
  MONTHLY
  QUARTERLY
  YEARLY
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}

/// Plan catalogue. Platform-level — plans are not owned by any organization.
model Plan {
  id   String @id @default(uuid())
  /// Stable machine key used in code and seeds. Never rename; add a new plan instead.
  code String @unique
  name String
  description String?

  /// Money is stored in the SMALLEST currency unit (paise) as Int.
  /// Never Float — 0.1 + 0.2 problems in an invoice total are not recoverable.
  priceMinor Int          @default(0)
  currency   String       @default("INR")
  interval   PlanInterval @default(MONTHLY)

  /// null = unlimited. Only seatLimit is ENFORCED in v1; the rest are reported.
  seatLimit      Int?
  leadLimit      Int?
  quotationLimit Int?
  storageLimitMb Int?

  /// Boolean feature flags, read through a typed helper — never indexed raw in the UI.
  features Json @default("{}")

  trialDays Int     @default(0)
  isActive  Boolean @default(true)
  sortOrder Int     @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  subscriptions Subscription[]

  @@index([isActive, sortOrder])
}

/// One live subscription per organization.
///
/// Plan changes MUTATE this row; the trail lives in AuditLog (and, from phase 3,
/// in Invoice). If the business ever needs queryable plan history, add a
/// SubscriptionPeriod child table rather than dropping the @unique — every
/// enforcement path assumes exactly one row per org.
model Subscription {
  id String @id @default(uuid())

  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  planId String
  plan   Plan   @relation(fields: [planId], references: [id])

  status SubscriptionStatus @default(TRIALING)

  /// Snapshot overrides. A negotiated seat count that must survive a plan-level
  /// edit lives here; null means "inherit from plan".
  seatLimitOverride Int?

  trialEndsAt        DateTime?
  currentPeriodStart DateTime  @default(now())
  currentPeriodEnd   DateTime?

  cancelledAt       DateTime?
  /// Cancel requested but access continues to currentPeriodEnd.
  cancelAtPeriodEnd Boolean @default(false)

  /// Manual/offline billing until a gateway is wired up (decision D2).
  billingEmail String?
  billingNotes String?

  /// Reserved for Razorpay/Stripe. Unused in v1 — present so adding a gateway
  /// is an additive migration.
  externalCustomerId     String?
  externalSubscriptionId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status, currentPeriodEnd])
  @@index([planId])
}
```

`organization.prisma` gains exactly one line:

```prisma
subscription Subscription? @relation()
```

Migration: `npx prisma migrate dev --name add_billing`.

**Backfill script** (`backend/src/scripts/backfillSubscriptions.ts`) — required, not optional. Every existing org must get a subscription or the enforcement layer has to handle "no subscription" as a special case forever:

1. Seed plans from a `PLAN_SEEDS` constant (`STARTER` / `GROWTH` / `ENTERPRISE`).
2. For every org with `deletedAt: null` and no subscription, create one on a grandfather plan with `status: ACTIVE` and a far-future `currentPeriodEnd`.
3. Idempotent — safe to re-run. Follow the shape of [seedSuperAdmin.ts](backend/src/scripts/seedSuperAdmin.ts).

**Decide with the lead:** should existing customers be grandfathered onto an unlimited plan indefinitely, or given a 90-day migration window? Default to unlimited-grandfather; a surprise seat block on a paying customer is a support incident.

## C3. State resolution without a scheduler

There is no cron (§B). A subscription must therefore resolve its *effective* state at read time. One pure function, one place:

`backend/src/utils/business/subscription.utils.ts`

```ts
export type SubscriptionState = {
  effectiveStatus: SubscriptionStatus;
  /** Reads allowed, writes blocked. */
  isReadOnly: boolean;
  /** Show a warning banner. */
  isWarning: boolean;
  daysRemaining: number | null;
  reason: string | null;
};

/**
 * Derive the state a subscription is ACTUALLY in right now.
 *
 * The stored `status` column is what an operator last set; this is what the
 * clock says. Nothing flips the column on a timer, so every enforcement point
 * must go through here — never read `subscription.status` directly.
 */
export const resolveSubscriptionState = (
  subscription: SubscriptionLike | null,
  now = new Date(),
): SubscriptionState => { /* ... */ };
```

Rules:
- `null` subscription → treat as `ACTIVE` and log a warning. After the backfill this should never happen; failing open is right because failing closed locks out every tenant on a bug in a brand-new module.
- `TRIALING` + `trialEndsAt < now` → `PAST_DUE`.
- `ACTIVE` + `currentPeriodEnd < now` → `PAST_DUE`.
- `PAST_DUE` + more than `GRACE_PERIOD_DAYS` (7) past the end → `EXPIRED` → `isReadOnly`.
- `CANCELLED` + `currentPeriodEnd > now` → behaves as `ACTIVE` with a warning (`cancelAtPeriodEnd`).
- `CANCELLED`/`EXPIRED` past the end → `isReadOnly`.

Unit-test this function directly — it is pure, it takes a `now`, and it is where every billing bug will live.

## C4. Enforcement points

### Seat limit — `userService.createUser`

The only enforced limit in v1.

```
countActiveSeats(orgId) = users WHERE organizationId = orgId
                            AND deletedAt IS NULL
                            AND status = 'ACTIVE'
```

Check in `createUser` **and** in `enableUser` / user-restore — otherwise an org at its limit disables a user, creates a new one, and re-enables the old one to get a free seat.

- `effectiveSeatLimit = subscription.seatLimitOverride ?? plan.seatLimit`; `null` → unlimited, skip.
- At limit → `throw AppError.business.ruleViolation("Seat limit reached...")` with the current count and limit in the message so the frontend can render something useful.
- `SUPER_ADMIN` creating a user inside a tenant **is still subject to the limit** — otherwise the number means nothing.
- Race condition: two admins creating the last seat simultaneously. Count-then-insert is not atomic. For v1, accept the ±1 overshoot and note it in a comment; the real fix is a conditional insert or an advisory lock and is not worth it at this scale. **Say this out loud in the PR** rather than leaving it implicit.

### Write blocking — `enforceSubscription` middleware

New file: `backend/src/middlewares/subscription.middleware.ts`

```ts
/**
 * Blocks writes for organizations whose subscription has lapsed.
 *
 * Reads are ALWAYS allowed — a tenant that cannot see its own data cannot
 * export it or decide to renew. Mount AFTER requireAuth on tenant modules.
 */
export const enforceSubscription = asyncHandler(async (req, _res, next) => { ... });
```

- Skip when `req.method === "GET"` / `HEAD` / `OPTIONS`.
- Skip for `SUPER_ADMIN`.
- Skip entirely on `/auth`, `/billing`, and profile routes — do not mount the middleware on those routers at all, rather than special-casing paths inside it.
- Otherwise resolve the org's state; if `isReadOnly`, throw a new `AppError.billing.subscriptionRequired()`.

Requires small additions:
- `HTTP_STATUS.PAYMENT_REQUIRED: 402` in [http-status.constants.ts](backend/src/constants/http-status.constants.ts)
- `SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED"` in [error-codes.constants.ts](backend/src/constants/error-codes.constants.ts)
- a `billing` group in [appError.ts](backend/src/utils/errors/appError.ts), following the existing factory pattern.

Mount on: `leads`, `prospects`, `quotations`, `items`, `users`. **Not** on `auth`, `dashboard`, `reports`, `audit-logs`, `announcements`.

**Do not touch `requireAuth`.** It currently hard-blocks on `Organization.status !== ACTIVE` ([auth.middleware.ts:58](backend/src/middlewares/auth.middleware.ts#L58)) — that is the manual suspension path and stays as-is. Subscription lapse is a *softer* state and must not be conflated with it.

### Frontend — 402 handling

Add a 402 branch to [interceptors.ts](frontend/src/lib/api/interceptors.ts) alongside the existing 401 refresh logic: read `error.response.data.code === "SUBSCRIPTION_REQUIRED"`, dispatch a toast, and set a flag in the auth slice so the UI can disable create buttons instead of letting users fill a form and lose it on submit.

## C5. Backend module — `backend/src/modules/billing/`

```
GET    /billing/plans                      → public-ish catalogue (requireAuth), active plans only
POST   /billing/plans                      → PLAN_MANAGE   (super-admin)
PATCH  /billing/plans/:id                  → PLAN_MANAGE
GET    /billing/subscription               → BILLING_READ  (caller's own org)
GET    /billing/usage                      → BILLING_READ  (seats/leads/quotations used vs limit)
GET    /billing/subscriptions              → PLAN_MANAGE   (all orgs, paginated — super-admin console)
PATCH  /billing/subscriptions/:orgId       → BILLING_MANAGE (assign plan, set period, change status)
POST   /billing/subscriptions/:orgId/cancel → BILLING_MANAGE
```

New permissions: `BILLING_READ` (`ADMIN` + `SUPER_ADMIN`), `BILLING_MANAGE` (`SUPER_ADMIN` only in v1 — flows from D2), `PLAN_MANAGE` (`SUPER_ADMIN` only, and never in `ROLE_PERMISSIONS[ADMIN]`).

New audit actions: `PLAN_CREATED`, `PLAN_UPDATED`, `SUBSCRIPTION_ASSIGNED`, `SUBSCRIPTION_PLAN_CHANGED`, `SUBSCRIPTION_CANCELLED`, `SUBSCRIPTION_STATUS_CHANGED`. Entity types `PLAN`, `SUBSCRIPTION`. Add `PLAN_CREATED` / `PLAN_UPDATED` to `PLATFORM_ONLY_AUDIT_ACTIONS` — the plan catalogue is platform operations, not tenant activity.

`GET /billing/usage` returns counts against limits. Compute with `prisma.$transaction([...counts])`, cache in react-query for 5 minutes. It is a dashboard number, not a gate.

## C6. Frontend — `frontend/src/features/billing/`

Two distinct surfaces; do not merge them into one component with role branches.

**Tenant-facing** — a "Billing" tab inside [SettingsPage.tsx](frontend/src/pages/SettingsPage.tsx) (already `SUPER_ADMIN` + `ADMIN` only): current plan card, status badge, renewal date, seat usage meter, feature list, "contact us to change plan" CTA (no self-serve until D2 says otherwise).

**Super-admin console** — a "Subscriptions" tab in [SuperAdminOrganizationWorkspacePage.tsx](frontend/src/pages/SuperAdminOrganizationWorkspacePage.tsx) plus a platform-wide list at `/super-admin/billing`: assign plan, set period, mark paid, cancel. A plans CRUD screen.

**Banner** — `TRIALING` (with days left), `PAST_DUE`, and `EXPIRED` each render a persistent strip in `DashboardLayout`. Reuse the `AnnouncementBanner` shell from Part A rather than writing a second banner; this is the concrete payoff of building A first.

Charts (seat usage over time, MRR) → load the **`dataviz` skill** before writing any chart code.

## C7. Acceptance criteria — Part C

- [ ] Backfill runs twice with no duplicates; every non-archived org has a subscription.
- [ ] An org on a 5-seat plan with 5 active users gets a clear 400 on the 6th create, naming the limit.
- [ ] Disable a user → seat frees → create succeeds. Re-enabling the disabled user is then blocked.
- [ ] Super-admin is subject to the same seat limit when creating inside a tenant.
- [ ] A trial whose `trialEndsAt` passed shows `PAST_DUE` with no job run, purely from the clock.
- [ ] 7 days past `PAST_DUE` → `EXPIRED` → `POST /leads` returns 402, `GET /leads` still returns 200.
- [ ] An `EXPIRED` org's admin can still reach settings/billing and log in.
- [ ] A manually `SUSPENDED` org still hard-blocks at login (existing behaviour unregressed).
- [ ] Editing a plan's `seatLimit` does not change an org that has a `seatLimitOverride`.
- [ ] Plan/subscription changes appear in the audit log; org admins do not see `PLAN_*` rows.
- [ ] `ADMIN` gets 403 on every `PLAN_MANAGE` route.

---

## 3. Ticket breakdown

Sized for one developer. "d" = ideal days; add your own buffer.

### Part A — Announcements

| # | Ticket | Est | Depends on |
|---|--------|-----|-----------|
| A-1 | Prisma models + relations + migration | 0.5d | — |
| A-2 | Contracts: constants, types, zod schemas (**both trees**) | 0.5d | A-1 |
| A-3 | Repository incl. `buildVisibilityWhere` + verification script | 1.5d | A-2 |
| A-4 | Service: CRUD + publish/archive + scope rules | 1.5d | A-3 |
| A-5 | Controller + routes + `app.ts` + permissions + audit actions | 0.5d | A-4 |
| A-6 | FE feature scaffold: api, types, query keys, hooks | 0.5d | A-2 |
| A-7 | Bell + feed dropdown + unread badge + optimistic read/dismiss | 1.5d | A-6, layout decision |
| A-8 | Banner in `DashboardLayout` | 0.5d | A-6 |
| A-9 | Management page: table, filters, create/edit dialog, routes, sidebar | 2d | A-6 |
| A-10 | Manual QA against the §A7 checklist | 0.5d | all |
|  | **Subtotal** | **~9.5d** | |

### Part C — Billing

| # | Ticket | Est | Depends on |
|---|--------|-----|-----------|
| C-0 | **Decision memo → lead. D1–D5 answered in writing.** | 0.5d | — |
| C-1 | Prisma models + migration + plan seeds + backfill script | 1d | C-0 |
| C-2 | Contracts (**both trees**) | 0.5d | C-1 |
| C-3 | `resolveSubscriptionState` + tests | 1d | C-2 |
| C-4 | Repository + service + controller + routes + permissions + audit | 2d | C-3 |
| C-5 | Seat enforcement in `userService` (create + enable + restore) | 1d | C-3 |
| C-6 | `enforceSubscription` middleware, 402 plumbing, mount points | 1d | C-3 |
| C-7 | FE: 402 interceptor branch + read-only flag in auth slice | 0.5d | C-6 |
| C-8 | FE: tenant billing tab in Settings + usage meter | 1.5d | C-2 |
| C-9 | FE: super-admin subscription console + plans CRUD | 2.5d | C-2 |
| C-10 | FE: subscription banners (reuse A-8 shell) | 0.5d | A-8, C-8 |
| C-11 | Manual QA against the §C7 checklist | 1d | all |
|  | **Subtotal** | **~13d** | |

### Part B — Notifications

Not estimated. Blocked on the scheduler decision (§B). Raise it as its own spike.

## 4. Suggested PR sequence

Small PRs, in this order. Each is independently reviewable and revertible.

1. `feat(announcements): schema + contracts` — A-1, A-2
2. `feat(announcements): backend module` — A-3…A-5
3. `feat(announcements): feed bell + banner` — A-6…A-8
4. `feat(announcements): management console` — A-9
5. `chore(billing): decision memo` — C-0, docs only
6. `feat(billing): schema, seeds, backfill` — C-1, C-2
7. `feat(billing): state resolution + enforcement` — C-3…C-6
8. `feat(billing): tenant billing surface` — C-7, C-8, C-10
9. `feat(billing): super-admin console` — C-9

## 5. Known gaps this plan does not close

State these in the PR description rather than letting a reviewer find them:

- **No scheduler.** Everything time-based is resolved at read time. Nothing happens to a lapsed subscription or a scheduled announcement until somebody makes a request. Acceptable now; a blocker for email notifications and dunning.
- **No email.** `nodemailer` is a dependency but is not used anywhere in `src/`. Announcements and billing warnings are in-app only.
- **No payment gateway.** Money moves offline (decision D2).
- **No test runner.** Verification is manual plus throwaway scripts. Worth its own ticket.
- **Contracts are hand-mirrored** between backend and frontend with nothing enforcing the copy. A shared package or a codegen step would remove a whole class of bug — worth raising separately.
- **Seat-limit race** allows a ±1 overshoot under concurrent creates.
- **No plan history table.** `Subscription` is mutated in place; history lives in `AuditLog` only. Fine until finance asks for a revenue report.
