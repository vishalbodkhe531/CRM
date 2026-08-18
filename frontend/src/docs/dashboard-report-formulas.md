# Dashboard and Report Formula Reference

This file documents the formulas used by CRM dashboards and reports. It is a reference file only; it is not imported by the app.

## Common Rules

- Percentage formula: `total > 0 ? round((part / total) * 100, 2) : 0`.
- A converted lead means `lead.convertedAt` is not null.
- Deleted leads and quotations are normally ignored with `deletedAt: null`.
- Approved revenue means quotation `status = "APPROVED"`.
- Report filters apply date range, executive, source, stage, status, and role-based scope.
- Role scope:
  - Super Admin dashboard: global counts.
  - Admin dashboard: organization-wide counts.
  - Manager dashboard: manager plus active executives under that manager.
  - Executive dashboard: current executive's assigned records.

## Formula Quick Reference

- Total Users = Count(users in scope)
- Super Admin Total Users = Count(users where role is not `SUPER_ADMIN`)
- Admin Total Users = Count(organization users where role is not `ADMIN`)
- Total Items = Count(items in scope)
- Total Organizations = Count(organizations)
- Total Leads = Count(leads where `deletedAt` is null)
- Assigned Today = Count(leads where `assignedAt` is today)
- My Leads = Count(leads where `assignedToId` is current executive)
- Total Prospects = Count(prospects linked to non-deleted leads)
- My Prospects = Count(prospects assigned/follow-up assigned/linked to current executive)
- Won Deals = Count(prospects where stage is `WON`)
- My Quotations = Count(quotations assigned/created/linked to current executive)
- Today's Follow-ups = Count(active prospects where `followUpDate` is today)
- Total Quotations = Count(quotations where `deletedAt` is null)
- Total Revenue = Sum(approved quotation `grandTotal`)
- Approved Quotations Value = Sum(quotation `grandTotal` where status is `APPROVED`)
- Pending Quotations Value = Sum(quotation `grandTotal` where status is `PENDING`)
- Conversion Rate % = (Prospects / Total Leads) * 100
- Team Performance % = (Converted Assigned Leads / Assigned Leads) * 100
- Lead to Prospect % = (Converted Leads / Total Leads) * 100
- Prospect to Customer % = (Won Prospects / Total Prospects) * 100
- Win Rate % = (Won Prospects / Total Prospects) * 100
- Lead Status % = (Status Lead Count / Total Leads) * 100
- Prospect Pipeline % = (Stage Prospect Count / Total Prospects) * 100
- Quotation Status % = (Status Quotation Count / Total Quotations) * 100
- Follow-up Completion % = (Completed Follow-ups / Scheduled Follow-ups) * 100
- Follow-up Health % = (Completed Follow-ups / Total Follow-ups) * 100
- Pending Follow-ups = Scheduled Follow-ups - Completed Follow-ups
- Active Leads = Total Leads - Converted Leads - Lost Leads
- Lost Leads = Count(leads where status is `UNQUALIFIED` and `convertedAt` is null)
- Overdue Follow-ups = Count(active prospects where follow-up date/time is before now)
- Active Follow-ups = Count(active prospects where follow-up date/time is now or in future)
- Pending Lead Allocation = Count(leads where `assignedToId` is null)
- Leads by Executive Active = Total Assigned Leads - Converted Leads - Lost Leads
- Monthly Approved Revenue = Sum(monthly quotation `grandTotal` where status is `APPROVED`)
- Monthly Pending Revenue = Sum(monthly quotation `grandTotal` where status is `PENDING`)
- Expected Value = Prospect `expectedValue`, or 0 when empty
- Quotation Grand Total = Quotation `grandTotal`
- Quotation Tax Total = Quotation `taxTotal`
- Quotation Subtotal = Quotation `subtotal`

## Super Admin Dashboard

Formula name: Total Users
Where used: Super Admin dashboard KPI card.
Files/components: `SuperAdminDashboardWidget.tsx`, `dashboard.repository.ts -> getSuperAdminStats`.
Formula logic: Count users where role is not `SUPER_ADMIN`.
Example: 18 users total, 1 super admin = 17 total users.
Meaning: Shows normal CRM users, excluding super admins.

Formula name: Total Items
Where used: Super Admin dashboard KPI card.
Files/components: `SuperAdminDashboardWidget.tsx`, `dashboard.repository.ts -> getSuperAdminStats`.
Formula logic: Count all catalog items.
Example: 120 item records = 120 total items.
Meaning: Shows how many products/items exist in the CRM.

Formula name: Total Leads
Where used: Super Admin dashboard KPI card.
Files/components: `SuperAdminDashboardWidget.tsx`, `dashboard.repository.ts -> getSuperAdminStats`.
Formula logic: Count leads where `deletedAt` is null.
Example: 500 leads, 20 deleted = 480 total leads.
Meaning: Shows all active leads across the system.

Formula name: Organizations
Where used: Super Admin dashboard KPI card.
Files/components: `SuperAdminDashboardWidget.tsx`, `dashboard.repository.ts -> getSuperAdminStats`.
Formula logic: Count organizations.
Example: 7 organization records = 7 organizations.
Meaning: Shows total companies/tenants in the CRM.

## Admin Dashboard

Formula name: Total Users
Where used: Admin dashboard KPI card.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: Count organization users where role is not `ADMIN`.
Example: 1 admin, 2 managers, 8 executives = 10 total users shown.
Meaning: Shows team members in the organization, excluding admins.

Formula name: Total Leads
Where used: Admin dashboard KPI card.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: Count organization leads where `deletedAt` is null.
Example: 150 leads, 5 deleted = 145 total leads.
Meaning: Shows all active leads in the organization.

Formula name: Total Prospects
Where used: Admin dashboard KPI card.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: Count organization prospects whose lead is not deleted.
Example: 40 prospects linked to active leads = 40 total prospects.
Meaning: Shows leads that have moved into the prospect pipeline.

Formula name: Total Quotations
Where used: Admin dashboard KPI card.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: Count organization quotations where `deletedAt` is null.
Example: 30 quotations, 2 deleted = 28 total quotations.
Meaning: Shows all active quotations created in the organization.

Formula name: Total Revenue
Where used: Admin dashboard KPI card is currently commented out; monthly revenue chart still uses quotation totals.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: Sum `grandTotal` for approved, non-deleted quotations.
Example: Approved quotation amounts 10000 + 25000 = 35000 total revenue.
Meaning: Shows realized revenue from approved quotations only.

Formula name: Conversion Rate
Where used: Admin dashboard KPI card.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: `(prospects / total leads) * 100`.
Example: 30 prospects / 120 total leads * 100 = 25%.
Meaning: Shows what percent of leads have moved into the prospect pipeline.

Formula name: Lead Status Distribution
Where used: Admin dashboard pie chart.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic:
- New = count of leads with status `NEW`.
- Contacted = count of leads with status `CONTACTED` + `ATTEMPTED_CONTACT`.
- Qualified = count of leads with status `QUALIFIED`.
- Lost = count of leads with status `UNQUALIFIED`.
- Converted = count of leads where `convertedAt` is not null.
Example: New 10, Contacted 15, Qualified 5, Lost 3, Converted 7.
Meaning: Shows how leads are distributed by current lead status and conversion.

Formula name: Monthly Revenue Trend
Where used: Admin dashboard bar chart.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic:
- Group quotations by month.
- Approved amount = sum `grandTotal` where status is `APPROVED`.
- Pending amount = sum `grandTotal` where status is `PENDING`.
Example: July approved 50000, July pending 20000.
Meaning: Shows approved revenue and pending quotation value month by month.

Formula name: Team Performance
Where used: Admin dashboard Team Performance section.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: `(converted assigned leads / total assigned leads) * 100` for each active manager/executive.
Example: Rohit has 2 converted leads and 3 assigned leads: 2 / 3 * 100 = 66.67%.
Meaning: Shows each user's lead conversion performance.

Formula name: Prospect Pipeline Funnel
Where used: Admin dashboard funnel section.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic:
- Requirement Gathering = prospects with stage `REQUIREMENT`.
- Initial Discussion = prospects with stage `FOLLOW_UP` + `DEMO`.
- Proposal Sent = prospects with stage `PROPOSAL`.
- Negotiation = prospects with stage `NEGOTIATION`.
- Won = prospects with stage `WON`.
- Lost = prospects with stage `LOST`.
Example: Requirement 8, Initial Discussion 10, Proposal 5, Negotiation 3, Won 4, Lost 2.
Meaning: Shows how many prospects are in each sales stage.

Formula name: Overdue Follow-ups
Where used: Admin dashboard CRM Alerts.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: Count active prospects where follow-up date is before today.
Example: 6 active prospects have old follow-up dates = 6 overdue follow-ups.
Meaning: Shows follow-ups that should already have happened.

Formula name: Pending Quotations
Where used: Admin dashboard CRM Alerts and Pending Quotations list.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: Count quotations where status is `PENDING` and `deletedAt` is null.
Example: 9 pending quotation records = 9 pending quotations.
Meaning: Shows quotations waiting for approval/action.

Formula name: New Leads To Contact
Where used: Admin dashboard CRM Alerts.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: Uses the New count from Lead Status Distribution.
Example: 14 leads with status `NEW` = 14 new leads to contact.
Meaning: Shows fresh leads needing first action.

Formula name: Prospects In Negotiation
Where used: Admin dashboard CRM Alerts.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: Uses the Negotiation count from Prospect Pipeline Funnel.
Example: 5 prospects with stage `NEGOTIATION` = 5 prospects in negotiation.
Meaning: Shows active deals currently being negotiated.

Formula name: Recent Leads Unassigned
Where used: Admin dashboard CRM Alerts.
Files/components: `AdminDashboardWidget.tsx`, `dashboard.repository.ts -> getAdminDashboardData`.
Formula logic: Count active leads where `assignedToId` is null.
Example: 11 leads have no assignee = 11 unassigned leads.
Meaning: Shows leads that still need assignment.

## Manager Dashboard

Formula name: My Executives
Where used: Manager dashboard KPI card.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic: Count active, non-deleted executives where `managerId` is the current manager.
Example: Manager has 6 active executives = 6 my executives.
Meaning: Shows team size under the manager.

Formula name: Total Leads
Where used: Manager dashboard KPI card and Lead Status Breakdown.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic: Count active leads assigned to the manager/team, created by the manager/team, or assigned by the manager.
Example: 80 leads in manager scope = 80 total leads.
Meaning: Shows all leads under the manager's responsibility.

Formula name: Assigned Today
Where used: Manager dashboard KPI card.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic: Count manager/team assigned leads where `assignedAt` is between today's start and end.
Example: 12 leads assigned today = 12 assigned today.
Meaning: Shows today's lead allocation volume.

Formula name: Total Prospects
Where used: Manager dashboard KPI card and Pipeline Funnel.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic: Count prospects in manager/team scope whose lead is not deleted.
Example: 32 matching prospects = 32 total prospects.
Meaning: Shows active pipeline size for the manager's team.

Formula name: Active Follow-ups
Where used: Manager dashboard KPI card.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic: Count active prospects with follow-up date and time that are not overdue, using a 5 minute grace window.
Example: 18 future or current follow-ups = 18 active follow-ups.
Meaning: Shows follow-ups still due now or later.

Formula name: Lead Status Breakdown
Where used: Manager dashboard donut chart.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic:
- New Leads = count of status `NEW`.
- In Progress = `ATTEMPTED_CONTACT` + `CONTACTED` + `QUALIFIED`.
- Disqualified/Lost = `UNQUALIFIED`.
- Each percentage = `(bucket count / total leads) * 100`.
Example: New 20, In Progress 50, Lost 10, total 80. New percentage = 20 / 80 * 100 = 25%.
Meaning: Shows lead progress for the manager's team.

Formula name: Follow-up Health
Where used: Manager dashboard Follow-up Health chart.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic:
- Total = count of `FOLLOW_UP_SET` activities in manager/team prospect scope.
- Completed = count where activity metadata `completedHealth` is `DONE`.
- Pending = total - completed.
- Completion percentage = `(completed / total) * 100`.
Example: 16 completed follow-ups / 20 total follow-ups * 100 = 80%.
Meaning: Shows whether scheduled follow-ups are being completed.

Formula name: Overdue Follow-ups
Where used: Manager dashboard Follow-up Health and Overdue Tasks.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic: Count active prospects with follow-up date and time before the current time, using a 5 minute grace window.
Example: 4 follow-ups are older than the grace time = 4 overdue.
Meaning: Shows follow-up tasks that need attention.

Formula name: Distribution
Where used: Manager dashboard Distribution chart.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic: Count assigned leads per executive, sort highest first, show top 6.
Example: Asha 20, Rohit 15, Neha 9.
Meaning: Shows how leads are distributed across the manager's executives.

Formula name: Pipeline Funnel
Where used: Manager dashboard Pipeline Funnel section.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic:
- Prospecting = total prospects.
- Qualified = leads with status `QUALIFIED`.
- Proposal = total quotations.
- Lost = leads with status `UNQUALIFIED`.
- Total Customers = prospects with stage `WON`.
Example: Prospecting 30, Qualified 18, Proposal 12, Lost 5, Customers 7.
Meaning: Shows a manager-level sales funnel summary.

Formula name: Executive Scorecard Conversion
Where used: Manager dashboard Executive Scorecard.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic: `(convertedProspects / assignedLeads) * 100` for each executive.
Example: 6 converted prospects / 12 assigned leads * 100 = 50%.
Meaning: Shows executive conversion score in the manager dashboard.

Formula name: Executive Scorecard Follow-up Completion
Where used: Manager dashboard Executive Scorecard.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic: `(completed follow-ups / total follow-ups) * 100` for each executive.
Example: 8 completed / 10 scheduled * 100 = 80%.
Meaning: Shows how consistently each executive completes follow-ups.

Formula name: Pending Lead Allocation
Where used: Manager dashboard Recently Added Lead section.
Files/components: `ManagerDashboardWidget.tsx`, `dashboard.repository.ts -> getManagerStats`.
Formula logic: Find active leads created by the manager/team where `assignedToId` is null, sorted newest first.
Example: 6 unassigned leads created by the team = 6 pending allocations shown.
Meaning: Shows new leads that still need an assignee.

## Executive Dashboard

Formula name: My Leads
Where used: Executive dashboard KPI card and My Lead Status.
Files/components: `ExecutiveDashboardWidget.tsx`, `dashboard.repository.ts -> getExecutiveStats`.
Formula logic: Count active leads where `assignedToId` is the current executive.
Example: 45 assigned leads = 45 my leads.
Meaning: Shows the executive's lead workload.

Formula name: Assigned Today
Where used: Executive dashboard KPI card.
Files/components: `ExecutiveDashboardWidget.tsx`, `dashboard.repository.ts -> getExecutiveStats`.
Formula logic: Count the executive's assigned leads where `assignedAt` is today.
Example: 5 leads assigned today = 5 assigned today.
Meaning: Shows new lead assignments received today.

Formula name: My Prospects
Where used: Executive dashboard KPI card and My Prospect Pipeline.
Files/components: `ExecutiveDashboardWidget.tsx`, `dashboard.repository.ts -> getExecutiveStats`.
Formula logic: Count prospects assigned to the executive, follow-up assigned to the executive, or linked to a lead assigned to the executive.
Example: 18 matching prospects = 18 my prospects.
Meaning: Shows the executive's pipeline.

Formula name: Won Deals
Where used: Executive dashboard KPI card is currently commented out.
Files/components: `ExecutiveDashboardWidget.tsx`, `dashboard.repository.ts -> getExecutiveStats`.
Formula logic: Count executive prospects where stage is `WON`.
Example: 4 won prospects = 4 won deals.
Meaning: Shows deals closed successfully.

Formula name: My Quotations
Where used: Executive dashboard KPI card and My Quotation Status.
Files/components: `ExecutiveDashboardWidget.tsx`, `dashboard.repository.ts -> getExecutiveStats`.
Formula logic: Count quotations assigned to the executive, created by the executive, or linked through the executive's prospects/leads.
Example: 13 matching quotations = 13 my quotations.
Meaning: Shows quotations connected to the executive's work.

Formula name: Today's Follow-ups
Where used: Executive dashboard KPI card and Today's Follow-ups list.
Files/components: `ExecutiveDashboardWidget.tsx`, `dashboard.repository.ts -> getExecutiveStats`.
Formula logic: Count active prospects in executive scope where follow-up date is today.
Example: 7 prospects have today's follow-up date = 7 today's follow-ups.
Meaning: Shows follow-up work due today.

Formula name: My Lead Status
Where used: Executive dashboard donut chart.
Files/components: `ExecutiveDashboardWidget.tsx`, `dashboard.repository.ts -> getExecutiveStats`.
Formula logic:
- New = non-converted leads with status `NEW`.
- Contacted = non-converted leads with status `CONTACTED` + `ATTEMPTED_CONTACT`.
- Qualified = non-converted leads with status `QUALIFIED`.
- Unqualified = non-converted leads with status `UNQUALIFIED`.
- Converted = leads where `convertedAt` is not null.
- Each percentage = `(bucket count / my leads) * 100`.
Example: Converted 9 / My Leads 45 * 100 = 20%.
Meaning: Shows status split for the executive's leads.

Formula name: My Prospect Pipeline
Where used: Executive dashboard pipeline chart.
Files/components: `ExecutiveDashboardWidget.tsx`, `dashboard.repository.ts -> getExecutiveStats`.
Formula logic:
- Requirement = count stage `REQUIREMENT`.
- Follow-up = count stage `FOLLOW_UP`.
- Demo = count stage `DEMO`.
- Proposal = count stage `PROPOSAL`.
- Negotiation = count stage `NEGOTIATION`.
- Won = count stage `WON`.
- Each percentage = `(stage count / my prospects) * 100`.
Example: Proposal 4 / 20 prospects * 100 = 20%.
Meaning: Shows where the executive's prospects are in the pipeline.

Formula name: My Quotation Status
Where used: Executive dashboard quotation donut chart.
Files/components: `ExecutiveDashboardWidget.tsx`, `dashboard.repository.ts -> getExecutiveStats`.
Formula logic:
- Approved = quotations with status `APPROVED`.
- Pending = quotations with status `PENDING`.
- Rejected = quotations with status `REJECTED`.
- Each percentage = `(status count / my quotations) * 100`.
Example: Approved 6 / 12 quotations * 100 = 50%.
Meaning: Shows status split of the executive's quotations.

Formula name: New Leads Unworked
Where used: Executive dashboard New Leads (Unworked) table.
Files/components: `ExecutiveDashboardWidget.tsx`, `dashboard.repository.ts -> getExecutiveStats`.
Formula logic: Find executive leads with status `NEW`, sorted by assigned date and created date.
Example: 5 new assigned leads = 5 unworked leads shown.
Meaning: Shows fresh leads the executive has not progressed yet.

## Reports - Shared Filters

Formula name: Report Date Range
Where used: All report tabs.
Files/components: `ReportsView.tsx`, `ReportFilters.tsx`, `reports.repository.ts -> getReportDateRange`.
Formula logic:
- Today = start and end of current day.
- This Week = Monday start through current day end.
- This Month = first day of current month through current day end.
- Custom = selected from/to dates.
- All Time = from earliest date to now.
Example: This Month on July 15 covers July 1 00:00 through July 15 23:59.
Meaning: Limits report data to the selected period.

Formula name: Report Role Scope
Where used: All report tabs.
Files/components: `ReportsView.tsx`, `reports.repository.ts -> getRoleFilters`.
Formula logic:
- Executive sees own assigned/created activity.
- Manager sees self plus direct team, unless an executive filter is selected.
- Admin/Super Admin sees organization data, unless an executive filter is selected.
Example: Manager with 3 executives sees manager + 3 executives unless filtering one executive.
Meaning: Keeps reports aligned with the user's access level.

## Lead Reports

Formula name: Total Leads
Where used: Lead Reports summary card.
Files/components: `LeadReports.tsx`, `reports.repository.ts -> getLeadReports`.
Formula logic: Count lead records matching report filters.
Example: 64 filtered lead records = 64 total leads.
Meaning: Shows how many leads match the current report filters.

Formula name: Converted Leads
Where used: Lead Reports summary card and Leads by Status chart.
Files/components: `LeadReports.tsx`, `reports.repository.ts -> getLeadReports`.
Formula logic: Count leads where `convertedAt` is not null.
Example: 16 converted leads = 16 converted.
Meaning: Shows leads converted to prospects.

Formula name: Lead Converted to Prospect Rate
Where used: Lead Reports Converted card text.
Files/components: `LeadReports.tsx`.
Formula logic: `(converted leads / total leads) * 100`, displayed with 1 decimal place.
Example: 16 converted / 64 total * 100 = 25.0%.
Meaning: Shows the lead conversion percentage in the Lead Reports tab.

Formula name: Active Leads
Where used: Lead Reports summary card.
Files/components: `LeadReports.tsx`.
Formula logic: `total leads - converted leads - lost leads`.
Example: 64 total - 16 converted - 8 lost = 40 active leads.
Meaning: Shows leads still being worked.

Formula name: Lost Leads
Where used: Lead Reports summary card and Leads by Status chart.
Files/components: `LeadReports.tsx`, `reports.repository.ts -> getLeadReports`.
Formula logic: Count non-converted leads where status is `UNQUALIFIED`.
Example: 8 unqualified leads = 8 lost leads.
Meaning: Shows leads that did not qualify.

Formula name: Leads by Status
Where used: Lead Reports pie chart.
Files/components: `LeadReports.tsx`, `reports.repository.ts -> getLeadReports`.
Formula logic:
- New = status `NEW` and not converted.
- Contacted = status `CONTACTED` or `ATTEMPTED_CONTACT` and not converted.
- Qualified = status `QUALIFIED` and not converted.
- Lost = status `UNQUALIFIED` and not converted.
- Converted = `convertedAt` is not null.
Example: New 20, Contacted 12, Qualified 8, Lost 4, Converted 6.
Meaning: Shows filtered leads by status.

Formula name: Leads by Source
Where used: Lead Reports bar chart.
Files/components: `LeadReports.tsx`, `reports.repository.ts -> getLeadReports`.
Formula logic:
- Website = source `WEBSITE`.
- Referral = source `REFERENCE`.
- Social Media = `SOCIAL_MEDIA`, `FACEBOOK`, `INSTAGRAM`, `LINKEDIN`.
- Campaign = `ADVERTISE`, `GOOGLE_ADS`, `EVENT`, `TRADE_SHOW`.
- Direct Inquiry = any other source.
Example: Website 10, Referral 6, Social Media 8, Campaign 4, Direct Inquiry 12.
Meaning: Shows where leads came from.

Formula name: Leads by Executive
Where used: Lead Reports executive table.
Files/components: `LeadReports.tsx`, `reports.repository.ts -> getLeadReports`.
Formula logic:
- Total Assigned = filtered leads assigned to that executive.
- Converted = assigned leads with `convertedAt` not null.
- Lost = assigned leads with status `UNQUALIFIED` and not converted.
- Active = total assigned - converted - lost.
Example: 20 assigned, 5 converted, 3 lost = 12 active.
Meaning: Shows lead workload and outcome by executive.

## Prospect Reports

Formula name: Total Prospects
Where used: Prospect Reports summary card.
Files/components: `ProspectReports.tsx`, `reports.repository.ts -> getProspectReports`.
Formula logic: Count prospects matching report filters and linked to active leads.
Example: 25 filtered prospects = 25 total prospects.
Meaning: Shows pipeline size for the selected report filter.

Formula name: Lead to Prospect Percentage
Where used: Prospect Reports summary card.
Files/components: `ProspectReports.tsx`, `reports.repository.ts -> getProspectReports`.
Formula logic: `(converted leads / total leads) * 100`.
Example: 20 converted leads / 80 total leads * 100 = 25%.
Meaning: Shows how many leads became prospects.

Formula name: Prospect to Customer Percentage
Where used: Prospect Reports summary card.
Files/components: `ProspectReports.tsx`, `reports.repository.ts -> getProspectReports`.
Formula logic: `(won prospects / total prospects) * 100`.
Example: 5 won prospects / 25 total prospects * 100 = 20%.
Meaning: Shows how many prospects became customers.

Formula name: Win Rate
Where used: Prospect Reports summary card as Prospect to Customer %, and dashboard won/customer summaries.
Files/components: `ProspectReports.tsx`, `ManagerDashboardWidget.tsx`, `ExecutiveDashboardWidget.tsx`, `reports.repository.ts -> getProspectReports`, `dashboard.repository.ts`.
Formula logic: `(won prospects / total prospects) * 100` when displayed as a rate. Dashboard cards usually show the won count directly.
Example: 8 won prospects / 40 total prospects * 100 = 20% win rate.
Meaning: Shows the percentage of prospects that became won customers.

Formula name: Sales Pipeline Stage Distribution
Where used: Prospect Reports horizontal bar chart.
Files/components: `ProspectReports.tsx`, `reports.repository.ts -> getProspectReports`.
Formula logic:
- Initial Discussion = stages `FOLLOW_UP` + `DEMO`.
- Requirement Gathering = stage `REQUIREMENT`.
- Proposal Sent = stage `PROPOSAL`.
- Negotiation = stage `NEGOTIATION`.
- Won = stage `WON`.
- Lost = stage `LOST`.
Example: Initial Discussion 9, Requirement 7, Proposal 5, Negotiation 3, Won 4, Lost 2.
Meaning: Shows where prospects are in the sales process.

Formula name: Expected Value
Where used: Prospect Records Details table.
Files/components: `ProspectReports.tsx`, `reports.repository.ts -> getProspectReports`.
Formula logic: Use prospect `expectedValue`, or 0 if empty.
Example: Prospect expected value 75000 = 75000 shown.
Meaning: Shows estimated deal value for a prospect.

## Quotation Reports

Formula name: Total Revenue Approved
Where used: Quotation Reports summary card.
Files/components: `QuotationReports.tsx`, `reports.repository.ts -> getQuotationReports`.
Formula logic: Sum `grandTotal` of approved quotations matching filters.
Example: Approved totals 10000 + 15000 + 25000 = 50000.
Meaning: Shows realized revenue from approved quotations.

Formula name: Approved Quotations Value
Where used: Quotation Reports summary card.
Files/components: `QuotationReports.tsx`, `reports.repository.ts -> getQuotationReports`.
Formula logic: Same as total approved revenue: sum `grandTotal` where status is `APPROVED`.
Example: Approved quotation values total 50000 = 50000.
Meaning: Shows total value of approved proposals.

Formula name: Pending Quotations Value
Where used: Quotation Reports summary card.
Files/components: `QuotationReports.tsx`, `reports.repository.ts -> getQuotationReports`.
Formula logic: Sum `grandTotal` where quotation status is `PENDING`.
Example: Pending totals 12000 + 8000 = 20000.
Meaning: Shows possible revenue waiting for approval.

Formula name: Monthly Revenue Trend
Where used: Quotation Reports line chart.
Files/components: `QuotationReports.tsx`, `reports.repository.ts -> getQuotationReports`.
Formula logic:
- Group quotations by month.
- Approved line = monthly sum of approved `grandTotal`.
- Pending line = monthly sum of pending `grandTotal`.
Example: July approved 50000 and pending 20000.
Meaning: Shows revenue and pending value over time.

Formula name: Quotations by Status
Where used: Quotation Reports bar chart.
Files/components: `QuotationReports.tsx`, `reports.repository.ts -> getQuotationReports`.
Formula logic: Count quotations by `APPROVED`, `PENDING`, and `REJECTED`.
Example: Approved 12, Pending 7, Rejected 2.
Meaning: Shows quotation approval status split.

Formula name: Quotation Amounts
Where used: Quotation Records Details table.
Files/components: `QuotationReports.tsx`, `reports.repository.ts -> getQuotationReports`.
Formula logic:
- Subtotal = quotation `subtotal`.
- Tax Total = quotation `taxTotal`.
- Grand Total = quotation `grandTotal`.
Example: Subtotal 10000, tax 1800, grand total 11800.
Meaning: Shows quotation money fields saved on each quotation record.

## Performance Reports

Formula name: Lead Conversion Leaderboard
Where used: Performance Reports conversion bar chart and leaderboard table.
Files/components: `PerformanceReports.tsx`, `reports.repository.ts -> getPerformanceReports`.
Formula logic: `(converted assigned leads / assigned leads) * 100` per active executive/manager.
Example: 6 converted leads / 20 assigned leads * 100 = 30%.
Meaning: Compares lead conversion by team member.

Formula name: Follow-up Efficiency Scheduled vs Completed
Where used: Performance Reports follow-up bar chart.
Files/components: `PerformanceReports.tsx`, `reports.repository.ts -> getPerformanceReports`.
Formula logic:
- Scheduled Follow-ups = filtered follow-up activities in the selected date range.
- Completed Follow-ups = scheduled follow-ups where metadata `completedHealth` is `DONE`.
Example: 15 scheduled and 9 completed.
Meaning: Compares scheduled work with completed work.

Formula name: Pending Follow-ups
Where used: Performance Reports leaderboard table.
Files/components: `PerformanceReports.tsx`, `reports.repository.ts -> getPerformanceReports`.
Formula logic: `scheduled follow-ups - completed follow-ups`.
Example: 15 scheduled - 9 completed = 6 pending.
Meaning: Shows follow-ups still not completed.

Formula name: Follow-up Completion Percentage
Where used: Performance Reports leaderboard table.
Files/components: `PerformanceReports.tsx`, `reports.repository.ts -> getPerformanceReports`.
Formula logic: `(completed follow-ups / scheduled follow-ups) * 100`.
Example: 9 completed / 15 scheduled * 100 = 60%.
Meaning: Shows follow-up completion rate for each team member.

## Existing Formula Concerns

Concern: Admin Lead Status Distribution may double count converted leads.
Where: `dashboard.repository.ts -> getAdminDashboardData`, displayed by `AdminDashboardWidget.tsx`.
Reason: Admin status counts are grouped from all leads, and Converted is added separately using `convertedAt`. If a converted lead still has status `QUALIFIED`, it can appear in both Qualified and Converted.
Example: 1 converted lead with status `QUALIFIED` can add 1 to Qualified and 1 to Converted.
Impact: The donut total can be higher than actual total leads.

Concern: Manager Executive Scorecard "Converted" count may be mislabeled.
Where: `dashboard.repository.ts -> getManagerStats`, displayed by `ManagerDashboardWidget.tsx`.
Reason: `convertedProspectGroups` currently counts all prospects assigned to each executive; it does not filter to stage `WON` or a specific converted-only condition.
Example: If an executive has 10 assigned leads and 6 prospects in any stage, the scorecard conversion becomes 6 / 10 * 100 = 60%, even if none are won.
Impact: The label "Converted" may imply won/converted prospects, but the current logic means assigned prospects.

Concern: Manager Pipeline Funnel mixes different record types.
Where: `dashboard.repository.ts -> getManagerStats`, displayed by `ManagerDashboardWidget.tsx`.
Reason: The funnel uses total prospects, qualified leads, total quotations, lost leads, and won prospects together.
Example: Proposal uses quotation count, while Customers uses won prospect count.
Impact: This may be intended as a summary funnel, but it is not a pure prospect-stage funnel.
