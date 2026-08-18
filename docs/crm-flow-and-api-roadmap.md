# CRM Flow, Prospect Detail Logic, and API Roadmap

Prepared from the current backend/frontend code and the BA documents under `docs/BA Docs`.

## 1. Current Project Snapshot

The app already has a solid first phase of a CRM:

| Area | Current state |
| --- | --- |
| Authentication | Login, refresh, logout, profile, change password, HTTP-only cookies, CSRF protection. |
| Organizations | Multi-tenant organization model and APIs are implemented. Backend base path is `/api/v1/organizations`. |
| Users | Roles, managers/team hierarchy, user CRUD, enable/disable/delete are implemented. |
| Items | Product/service master is implemented and used by leads as product interest. |
| Leads | Create, import, list, detail, update, status update, assign, convert to prospect, soft delete. |
| Prospects | List, detail, conversion, edit basic info, stage update, follow-up update, manual activity logging, delete. |
| Dashboard | Basic role-based counts exist for super admin, admin, manager, executive. |
| Reports, Customers, Quotations, Follow Ups, Settings | Frontend routes exist, but pages are still `ComingSoonPage`. Dedicated backend modules are not implemented yet. |

The current prospect implementation is close to the BA prospect requirement:

- Prospect is created from a qualified lead.
- Prospect stores stage, expected value, close date, follow-up data, notes, assignee, and activities.
- Activities include conversion, stage change, call, meeting, and email placeholder.
- Won and Lost are terminal stages in the service layer.
- Follow-up health is derived as `OK`, `WARNING`, `OVERDUE`, or `NONE`.

## 2. Terminology Decision

The BA documents and code use slightly different language. The app should standardize vocabulary now so the frontend, backend, reports, and documentation do not drift.

| Business term in BA docs | Current code term | Recommended app term |
| --- | --- | --- |
| Relevant lead | `QUALIFIED` | Use `QUALIFIED` in code, display as `Qualified` or `Relevant/Qualified` only if business insists. |
| Not Relevant lead | `UNQUALIFIED` | Use `UNQUALIFIED`, display as `Unqualified`. |
| Quote prospect stage | `PROPOSAL` | Keep `PROPOSAL` in code, display label as `Quote`. |
| Converted lead | Derived from `prospect` or `convertedAt` | Keep conversion as a derived state instead of changing lead status to `CONVERTED`. Show a separate `Converted` badge in UI. |

Recommended rule: lead status describes qualification/contact state; conversion describes whether the lead produced a prospect. This keeps traceability clean.

## 3. What To Keep On Prospect Detail Page

The prospect detail page should be a sales workspace, not only an edit form. The user should immediately understand:

- Who is this prospect?
- Where are they in the pipeline?
- What happens next?
- What happened before?
- What commercial outcome is expected?

### 3.1 Sticky Header

Keep this at the top:

- Back button.
- Prospect number.
- Linked lead number.
- Company name.
- Contact name, email, mobile.
- Current stage badge.
- Prospect status badge: Active, Won, Lost.
- Follow-up health badge: set, warning, overdue, none.
- Assigned user.
- Quick actions:
  - Email placeholder.
  - Log call.
  - Log meeting.
  - Create quotation when stage is `PROPOSAL` or later.
  - Mark Won / Mark Lost when the deal is closing.

Current frontend already has most of this. Add visible Lead No/link and later quotation actions.

### 3.2 Summary Cards

Keep four to six small summary cards:

- Assigned To.
- Created Date / Converted Date.
- Expected Value.
- Close Date.
- Next Follow-up.
- Last Activity.

Current frontend has Assigned To, Created Date, Expected Value, Next Follow-up. Add Close Date because the model already stores `closeDate`.

### 3.3 Basic Details

Keep these fields:

Contact and company:

- First Name.
- Last Name.
- Company Name.
- Email.
- Mobile.
- Alternate Mobile, if available from lead.
- Website and LinkedIn, if available from lead.
- Address, city, state, pin code, if needed for customer conversion.

Lead context:

- Source Lead No.
- Lead Source.
- Industry.
- Lead Type.
- Product Interested.
- Required Description.
- Original lead created date.
- Converted by and converted date.

Commercial fields:

- Expected Value.
- Close Date.
- Notes.
- Assigned To.
- Optional future fields: budget range, purchase timeline, decision maker, decision maker role, decision maker contact.

Recommended behavior:

- Contact/company/commercial fields can be edited by permitted users while prospect is active.
- Source lead metadata should be mostly read-only so original lead context is not accidentally lost.
- Won and Lost prospects should be read-only unless an admin reopens them.

### 3.4 Stage Section

Keep a dedicated stage section. It is logically correct and should remain separate from basic details.

Stages:

1. `REQUIREMENT`
2. `FOLLOW_UP`
3. `DEMO`
4. `PROPOSAL`
5. `NEGOTIATION`
6. `WON`
7. `LOST`

Rules:

- Default stage after conversion is `REQUIREMENT`.
- Every stage change must require a comment of at least 10 characters.
- Each stage change must create an activity log.
- Won and Lost are terminal.
- Admin-only reopen should be added later if the business needs it.

Current code already logs stage changes and blocks edits after Won/Lost. That is correct for MVP.

Open decision:

- BA docs list allowed next stages, but also say stage can move forward or backward manually with comment.
- Recommendation: allow forward/backward movement while active, but always require a comment. For stricter pipeline control later, add transition validation.

### 3.5 Follow-up Section

Keep a dedicated follow-up section. It is essential for sales execution.

Fields:

- Next Follow-up Date, required for active prospects.
- Follow-up Time.
- Follow-up Type: Call, Email, Meeting, WhatsApp, Site Visit.
- Reminder: 15 minutes, 30 minutes, 1 hour, 1 day.
- Assigned To.
- Notes.

Rules:

- Date must be today or future.
- Active prospect without follow-up for more than 7 days shows warning.
- Active prospect without follow-up for more than 14 days shows overdue.
- Won and Lost prospects do not need follow-ups, so hide the section.
- Completing a follow-up should force the user to log outcome and set the next follow-up.

Current code stores one next follow-up on the prospect. That is fine for MVP. For the full app, add a dedicated FollowUp/Task model so follow-ups can be listed, completed, snoozed, reminded, and reported.

### 3.6 Activity Timeline

Keep activity timeline as the audit trail.

Activity types:

- Conversion, automatic.
- Stage Change, automatic.
- Call, manual.
- Meeting, manual.
- Email, currently placeholder/manual.
- Future: Follow-up completed, quotation sent, quotation accepted/rejected, customer created, payment/invoice events if scope expands.

Rules:

- Show latest first.
- Show type badge, date/time, user, summary, details.
- Activities should be immutable after creation.
- Do not allow normal users to delete activity. Admin can archive only if the business needs it.

Current code matches this well.

### 3.7 Related Records To Add Later

Add these tabs or sections when their modules exist:

- Quotations: quote list, latest quote status, create quote action.
- Customer: visible only after Won or after customer conversion.
- Files/Attachments: requirements, proposal files, documents.
- Internal notes: if notes become separate threaded records.

Do not overload the basic section with all of these now. Keep them as related modules.

## 4. Is The Current Prospect Detail Logic Correct?

Yes, the current logical split is correct:

- Basic Details answers "who and what is the opportunity?"
- Stage answers "where is it in the pipeline?"
- Follow-up answers "what is the next action?"
- Activity Timeline answers "what happened before?"

That is the right CRM workflow.

The current implementation should be adjusted in these places:

| Gap | Why it matters | Recommended fix |
| --- | --- | --- |
| Close Date is in backend model but not fully surfaced in prospect edit UI. | Sales forecast and reports need it. | Add `closeDate` to prospect detail summary and update form/API payload. |
| Prospect delete is currently a hard delete. | BA rule says archive/soft delete; audit history should remain. | Add `deletedAt`, `deletedById` to `Prospect`; change delete API to soft delete. |
| Converted lead deletion is not blocked. | Deleting a converted lead breaks traceability. | Block delete when lead has a prospect, or admin-only archive both safely. |
| Follow-up reminder is stored but no notification/reminder worker exists. | Users will not actually receive reminders. | Add Notification and FollowUp/Task services with scheduler. |
| `api-spec.md` is stale. | Team may build against wrong routes. | Update it for `/api/v1/organizations`, prospect follow-up, and prospect activities. |
| Lead transition docs and code do not match. | API spec says restricted transitions; code allows any status change before conversion. | Decide and document one rule. |
| `BANKING_FINANCE` exists in contract constants/types but not Prisma enum. | Can cause validation/API mismatch. | Align Prisma enum, backend constants, frontend labels, and seed data. |
| Executive frontend actions are more open than backend permissions. | User can see buttons that backend rejects. | Gate create/update/delete buttons by permissions, not route role only. |

## 5. Complete CRM Lifecycle Flow

### 5.1 Setup Flow

1. Super admin creates organization.
2. Admin/manager/users are created inside the organization.
3. Items are created as products/services.
4. Leads are created manually or imported.
5. Leads are assigned to executives.

### 5.2 Lead Flow

Recommended status flow:

1. `NEW`
2. `ATTEMPTED_CONTACT`
3. `CONTACTED`
4. `QUALIFIED` or `UNQUALIFIED`

Rules:

- Lead can be created manually or imported.
- Manager/admin can assign lead to executive.
- Executive should see and work only their own leads.
- Lead becomes prospect only when status is `QUALIFIED`.
- Conversion creates one prospect linked to the lead.
- Converted lead should remain visible as source history and show `Converted` derived badge.
- Converted lead should not be deleted by normal users.

Current code has most of this, except transition strictness and converted lead deletion protection.

### 5.3 Prospect Flow

1. Qualified lead is converted.
2. Prospect is created with stage `REQUIREMENT`.
3. User schedules next follow-up.
4. User logs call/meeting/email activities.
5. User moves stage with mandatory comment.
6. At `PROPOSAL`, quotation can be created and sent.
7. At `NEGOTIATION`, commercial discussion continues.
8. If Won:
   - stage becomes `WON`;
   - prospect becomes read-only;
   - customer should be created or linked;
   - accepted quotation/order information should be stored.
9. If Lost:
   - stage becomes `LOST`;
   - lost reason should be mandatory;
   - prospect becomes read-only;
   - no follow-up required unless reopened by admin.

### 5.4 Customer Flow

Customer should not be a manually duplicated prospect in normal flow.

Recommended flow:

1. Prospect is marked Won.
2. System asks for won details:
   - won value;
   - final quotation;
   - close date;
   - customer owner;
   - notes.
3. System creates Customer from prospect/lead data.
4. Customer keeps link to source prospect and source lead.
5. Customer detail shows contacts, quotations, activity history, and future account work.

### 5.5 Quotation Flow

1. User creates quotation from prospect.
2. Quotation pulls company/contact details and item catalog.
3. User adds line items, quantity, price, discount, GST/tax.
4. Quotation is saved as Draft.
5. User sends or marks as Sent.
6. Customer/prospect accepts, rejects, expires, or asks for revision.
7. Accepted quotation can support closing prospect as Won.

### 5.6 Follow-up Flow

Current prospect field can show next follow-up, but full app needs follow-up as its own task:

1. User schedules follow-up against prospect/customer/lead.
2. Follow-up appears in Follow Ups page.
3. Reminder notification is created before due time.
4. User completes follow-up with outcome.
5. Completion logs an activity.
6. User sets next follow-up if the record remains active.

## 6. Existing APIs

Base path: `/api/v1`.

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `PATCH /auth/profile`
- `POST /auth/change-password`

### Organizations

- `GET /organizations`
- `POST /organizations`
- `GET /organizations/:id`
- `PATCH /organizations/:id`
- `PATCH /organizations/:id/status`
- `GET /organizations/:id/users`

### Users

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`
- `PATCH /users/:id/disable`
- `PATCH /users/:id/enable`
- `DELETE /users/:id`

### Items

- `POST /items`
- `GET /items`
- `GET /items/:id`
- `PATCH /items/:id`
- `PATCH /items/:id/toggle-status`
- `DELETE /items/:id`

### Leads

- `POST /leads`
- `POST /leads/import`
- `GET /leads/assignable-users`
- `GET /leads`
- `GET /leads/:id`
- `PATCH /leads/:id`
- `PATCH /leads/:id/status`
- `PATCH /leads/:id/assign`
- `POST /leads/:id/convert`
- `DELETE /leads/:id`

### Prospects

- `GET /prospects`
- `GET /prospects/:id`
- `POST /prospects/convert`
- `PATCH /prospects/:id`
- `PATCH /prospects/:id/stage`
- `PATCH /prospects/:id/follow-up`
- `POST /prospects/:id/activities`
- `DELETE /prospects/:id`

### Dashboard

- `GET /dashboard/super-admin`
- `GET /dashboard/admin`
- `GET /dashboard/manager`
- `GET /dashboard/executive`

## 7. APIs Needed To Complete The App

### 7.1 Lead Module Additions

Add:

- `POST /leads/:id/activities` - log lead call/email/meeting before conversion.
- `GET /leads/:id/activities` - lead timeline.
- `POST /leads/bulk-assign` - admin/manager bulk assignment.
- `GET /leads/export` - export filtered lead list.
- `GET /leads/duplicates` - duplicate check by email/mobile/company.
- `POST /leads/:id/reopen` - optional admin-only reopen if unqualified.

Also fix:

- Prevent normal delete of converted lead.
- Add permission-aware frontend buttons.
- Decide if lead status transitions are strict or open.

### 7.2 Prospect Module Additions

Add:

- `PATCH /prospects/:id/assign` - explicit assignee change.
- `POST /prospects/bulk-assign` - admin/manager bulk assignment.
- `GET /prospects/export` - export filtered prospects.
- `POST /prospects/:id/reopen` - admin-only reopen from Won/Lost.
- `POST /prospects/:id/close-won` - close with won value, close date, quotation/customer link.
- `POST /prospects/:id/close-lost` - close with mandatory lost reason.
- `GET /prospects/:id/quotations` - related quotations.
- `POST /prospects/:id/convert-to-customer` - create/link customer from won prospect.

Data fields to add:

- `lostReason`
- `wonValue`
- `actualCloseDate`
- `reopenedAt`
- `reopenedById`
- `deletedAt`
- `deletedById`

### 7.3 Follow-ups / Tasks Module

Add model: `FollowUp` or `Task`.

Important fields:

- `id`
- `entityType`: LEAD, PROSPECT, CUSTOMER
- `entityId`
- `type`
- `dueAt`
- `status`: OPEN, COMPLETED, SNOOZED, CANCELLED, OVERDUE
- `assignedToId`
- `createdById`
- `reminderAt`
- `completedAt`
- `outcome`
- `notes`
- `nextFollowUpId`
- `organizationId`

APIs:

- `GET /follow-ups`
- `GET /follow-ups/:id`
- `POST /follow-ups`
- `PATCH /follow-ups/:id`
- `POST /follow-ups/:id/complete`
- `POST /follow-ups/:id/snooze`
- `DELETE /follow-ups/:id`
- `GET /follow-ups/calendar`

Frontend:

- My Follow-ups.
- Team Follow-ups for manager/admin.
- Due today.
- Overdue.
- Upcoming.
- Complete follow-up modal with outcome and next date.

### 7.4 Notifications Module

Needed because reminders currently do not actually notify anyone.

Add model: `Notification`.

APIs:

- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `DELETE /notifications/:id`

Jobs:

- Scheduled job to create reminder notifications.
- Scheduled job to mark follow-ups overdue.
- Optional email notification integration later.

### 7.5 Quotations Module

Add models:

- `Quotation`
- `QuotationLineItem`
- Optional `QuotationRevision`

Important quotation fields:

- `quotationNo`
- `prospectId`
- `customerId`
- `organizationId`
- `status`: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CANCELLED
- `validUntil`
- `subtotal`
- `discount`
- `taxTotal`
- `grandTotal`
- `terms`
- `notes`
- `sentAt`
- `acceptedAt`
- `rejectedAt`
- `createdById`

APIs:

- `POST /quotations`
- `GET /quotations`
- `GET /quotations/:id`
- `PATCH /quotations/:id`
- `POST /quotations/:id/send`
- `POST /quotations/:id/revise`
- `PATCH /quotations/:id/status`
- `GET /quotations/:id/pdf`
- `DELETE /quotations/:id`

Frontend:

- Quotation list.
- Create/edit quotation from prospect.
- Line item editor using Items.
- PDF preview/download.
- Status actions.
- Link accepted quotation to close-won.

### 7.6 Customers Module

Add models:

- `Customer`
- Optional `CustomerContact`

Important customer fields:

- `customerNo`
- `sourceProspectId`
- `sourceLeadId`
- `organizationId`
- `companyName`
- `primaryContactName`
- `email`
- `mobile`
- `address`
- `ownerId`
- `status`: ACTIVE, INACTIVE, CHURNED
- `createdAt`
- `updatedAt`

APIs:

- `GET /customers`
- `GET /customers/:id`
- `POST /customers`
- `PATCH /customers/:id`
- `PATCH /customers/:id/status`
- `GET /customers/:id/activities`
- `GET /customers/:id/quotations`
- `GET /customers/:id/follow-ups`

Recommended creation rule:

- Prefer `POST /prospects/:id/convert-to-customer` or `POST /prospects/:id/close-won` as the normal source.
- Keep manual `POST /customers` admin-only for exceptional cases.

### 7.7 Reports Module

The current dashboard is simple counts. Full reports need filtered aggregate APIs.

APIs:

- `GET /reports/lead-funnel`
- `GET /reports/lead-sources`
- `GET /reports/lead-conversion`
- `GET /reports/prospect-pipeline`
- `GET /reports/prospect-stage-aging`
- `GET /reports/follow-ups`
- `GET /reports/sales-performance`
- `GET /reports/revenue-forecast`
- `GET /reports/customers`
- `POST /reports/export`

Common query filters:

- `from`
- `to`
- `assignedToId`
- `managerId`
- `stage`
- `status`
- `source`
- `industry`
- `organizationId` for super admin only.

Report views:

- Lead funnel by status.
- Lead source performance.
- Conversion rate: lead to prospect, prospect to won.
- Pipeline by stage and expected value.
- Overdue follow-ups by user/team.
- Sales performance by executive.
- Forecast by close date.
- Lost reason analysis.
- Customer acquisition count and value.

### 7.8 Files / Attachments Module

Useful for proposals, requirement documents, meeting notes, and customer documents.

APIs:

- `POST /files`
- `GET /files`
- `GET /files/:id`
- `DELETE /files/:id`

Fields:

- `entityType`
- `entityId`
- `fileName`
- `mimeType`
- `size`
- `url`
- `uploadedById`
- `organizationId`

### 7.9 Settings Module

Settings page currently exists but is coming soon.

APIs:

- `GET /settings/organization`
- `PATCH /settings/organization`
- `GET /settings/notifications`
- `PATCH /settings/notifications`
- `GET /settings/pipeline`
- `PATCH /settings/pipeline`

Keep pipeline stages fixed for MVP. Add configurable stages only after reports and stage logic are stable.

## 8. Permissions To Add

Current permissions exist for users, orgs, dashboard, items, leads, prospects.

Add:

- `CUSTOMER_CREATE`
- `CUSTOMER_READ`
- `CUSTOMER_UPDATE`
- `CUSTOMER_DELETE`
- `QUOTATION_CREATE`
- `QUOTATION_READ`
- `QUOTATION_UPDATE`
- `QUOTATION_DELETE`
- `FOLLOW_UP_CREATE`
- `FOLLOW_UP_READ`
- `FOLLOW_UP_UPDATE`
- `FOLLOW_UP_DELETE`
- `REPORT_READ`
- `REPORT_EXPORT`
- `NOTIFICATION_READ`
- `NOTIFICATION_UPDATE`
- `FILE_CREATE`
- `FILE_READ`
- `FILE_DELETE`
- `SETTINGS_READ`
- `SETTINGS_UPDATE`

Recommended access:

| Role | Lead | Prospect | Follow-up | Quotation | Customer | Reports |
| --- | --- | --- | --- | --- | --- | --- |
| Super Admin | All via selected org | All via selected org | All via selected org | All via selected org | All via selected org | Global and org |
| Admin | Org all | Org all | Org all | Org all | Org all | Org reports |
| Manager | Team/self | Team/self | Team/self | Team/self | Team/self | Team reports |
| Executive | Own assigned | Own assigned | Own assigned | Own assigned or created | Own assigned if business wants | Own performance only |

Also update route guards and action buttons so users do not see actions they cannot execute.

## 9. Recommended Build Order

### Phase 1: Clean Current CRM Core

1. Update `backend/docs/api-spec.md` to match current routes.
2. Align lead status terminology and transition rules.
3. Fix enum mismatch around `BANKING_FINANCE`.
4. Add Close Date to prospect detail UI and update schema.
5. Add Lead No/source context in prospect header/basic info.
6. Prevent delete of converted leads.
7. Change prospect delete to soft delete.
8. Permission-gate frontend buttons for executive/admin/manager differences.

### Phase 2: Complete Prospect Operations

1. Add close-won and close-lost APIs.
2. Add lost reason and won value fields.
3. Add admin reopen.
4. Add prospect export.
5. Add bulk assign.
6. Add follow-up completion behavior.

### Phase 3: Follow-ups And Notifications

1. Add FollowUp model and APIs.
2. Build Follow Ups page.
3. Add reminder scheduler.
4. Add notification APIs and header notification UI.
5. Connect follow-up completion to activity timeline.

### Phase 4: Quotations

1. Add quotation models and APIs.
2. Build quotation list and detail/create UI.
3. Add line item editor from Items.
4. Add PDF generation/download.
5. Connect accepted quotation to close-won.

### Phase 5: Customers

1. Add customer model and APIs.
2. Convert won prospect to customer.
3. Build customer list and detail UI.
4. Show linked prospect, lead, quotations, activities, follow-ups.

### Phase 6: Reports

1. Add report aggregate APIs.
2. Build Reports page with date filters.
3. Add exports.
4. Add role-scoped dashboards for pipeline, follow-ups, conversion, and revenue forecast.

### Phase 7: Settings, Files, Polish

1. Add organization settings.
2. Add notification settings.
3. Add file attachments.
4. Add audit logs where required.
5. Add integration-ready email support after placeholder phase.

## 10. Final Product Logic

The complete app should work like this:

1. Organization, users, and products/services are configured.
2. Leads are created or imported.
3. Leads are assigned and contacted.
4. Qualified leads are converted to prospects.
5. Prospects are managed through stages, follow-ups, activities, and quotations.
6. Won prospects become customers.
7. Follow-ups and notifications keep daily work moving.
8. Reports show conversion, pipeline, performance, overdue work, and revenue forecast.

The current prospect page direction is logically correct. The next major work is not to redesign it from scratch, but to complete the missing lifecycle around it: follow-up tasks, quotations, customers, reports, notifications, and stricter data integrity.
