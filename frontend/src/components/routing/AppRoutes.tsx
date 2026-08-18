import { lazy } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import RoleGuard from "@/components/guards/RoleGuard";
import AuthEntryRoute from "@/components/routing/AuthEntryRoute";
import {
  ALL_AUTHENTICATED_ROLES,
  ANNOUNCEMENTS_ROUTE_ROLES,
  AUDIT_ROUTE_ROLES,
  CUSTOMERS_ROUTE_ROLES,
  DASHBOARD_ROUTE_ROLES,
  FOLLOW_UPS_ROUTE_ROLES,
  ITEMS_ROUTE_ROLES,
  LEADS_ROUTE_ROLES,
  ORGANIZATION_ADMIN_ROUTE_ROLES,
  QUOTATIONS_ROUTE_ROLES,
  REPORTS_ROUTE_ROLES,
  SETTINGS_ROUTE_ROLES,
  SIGNUP_REQUESTS_ROUTE_ROLES,
  USERS_ROUTE_ROLES,
} from "@/constants/roles";

const DashboardLayout = lazy(
  () => import("@/components/layout/DashboardLayout"),
);
const SignUpPage = lazy(() => import("@/pages/SignUpPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const UserDetailPage = lazy(() => import("@/pages/UserDetailPage"));
const ItemsPage = lazy(() => import("@/pages/ItemsPage"));
const ItemDetailPage = lazy(() => import("@/pages/ItemDetailPage"));
const LeadPage = lazy(() => import("@/pages/LeadPage"));
const QuotationPage = lazy(() => import("@/pages/QuotationPage"));
const QuotationDetailPage = lazy(() => import("@/pages/QuotationDetailPage"));
const LeadDetailPage = lazy(() => import("@/pages/LeadDetailPage"));
const ProspectPage = lazy(() => import("@/pages/ProspectPage"));
const ProspectDetailPage = lazy(() => import("@/pages/ProspectDetailPage"));
const CustomersPage = lazy(() => import("@/pages/CustomersPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const FollowUpsPage = lazy(() => import("@/pages/FollowUpsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const HelpPage = lazy(() => import("@/pages/HelpPage"));
const OrganizationsPage = lazy(() => import("@/pages/OrganizationsPage"));
const SignupRequestsPage = lazy(() => import("@/pages/SignupRequestsPage"));
const AuditLogPage = lazy(() => import("@/pages/AuditLogPage"));
const AnnouncementsPage = lazy(() => import("@/pages/AnnouncementsPage"));
const AnnouncementFormPage = lazy(() => import("@/pages/AnnouncementFormPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SuperAdminBillingPage = lazy(() => import("@/pages/SuperAdminBillingPage"));
const PlatformSettingsPage = lazy(() => import("@/pages/PlatformSettingsPage"));
const SuperAdminPlanFormPage = lazy(
  () => import("@/pages/SuperAdminPlanFormPage"),
);
const SuperAdminSubscriptionFormPage = lazy(
  () => import("@/pages/SuperAdminSubscriptionFormPage"),
);
const OrganizationBillingPage = lazy(
  () => import("@/pages/OrganizationBillingPage"),
);
const OrganizationDetailPage = lazy(
  () => import("@/pages/OrganizationDetailPage"),
);
const SuperAdminOrganizationWorkspacePage = lazy(
  () => import("@/pages/SuperAdminOrganizationWorkspacePage"),
);
const ProfileLayout = lazy(() => import("@/pages/profile/ProfileLayout"));
const PersonalInfo = lazy(() => import("@/pages/profile/PersonalInfo"));
const ChangePassword = lazy(() => import("@/pages/profile/ChangePassword"));

/**
 * Retires the old `/:orgSlug/*` tenant URLs.
 *
 * Tenant pages used to be mounted twice — once flat and once under the user's
 * organization slug — and a guard rewrote every tenant URL to add the prefix.
 * The slug was derived from the user's own session and could never differ (the
 * backend pins each user to one organization), so it identified nothing the app
 * did not already know while costing a guard, a path rewriter, and a duplicate
 * copy of all 29 tenant routes.
 *
 * Kept permanently rather than deleted: links to the old scheme live in
 * bookmarks, browser history, emails and support tickets, and a redirect is
 * cheaper than any of those breaking.
 *
 * React Router ranks static segments above dynamic ones, so every real route
 * (`/users/:id`, `/platform/billing`) still wins against this pattern; it
 * only catches what would otherwise have 404'd.
 */
const LegacyOrgSlugRedirect = () => {
  const location = useLocation();

  // Drop the leading slug segment: /acme/leads/123 -> /leads/123
  const withoutSlug = location.pathname.replace(/^\/[^/]+/, "");

  return (
    <Navigate
      to={`${withoutSlug || "/dashboard"}${location.search}`}
      replace
    />
  );
};

/**
 * Preserves links issued before platform administration had its own canonical
 * route namespace. Announcements are intentionally shared, so their legacy
 * paths retain the unprefixed destination.
 */
const LegacyPlatformRedirect = () => {
  const location = useLocation();
  const destination = location.pathname.startsWith("/super-admin/announcements")
    ? location.pathname.replace(/^\/super-admin/, "")
    : location.pathname.replace(/^\/(?:super-admin|admin)/, "/platform");

  return <Navigate to={`${destination}${location.search}`} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<AuthEntryRoute />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard"
            element={
              <RoleGuard roles={DASHBOARD_ROUTE_ROLES}>
                <Dashboard />
              </RoleGuard>
            }
          />

          <Route
            path="/users"
            element={
              <RoleGuard roles={USERS_ROUTE_ROLES}>
                <UsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="/users/new"
            element={
              <RoleGuard roles={USERS_ROUTE_ROLES}>
                <UserDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="/users/:id"
            element={
              <RoleGuard roles={USERS_ROUTE_ROLES}>
                <UserDetailPage />
              </RoleGuard>
            }
          />

          <Route
            path="/items"
            element={
              <RoleGuard roles={ITEMS_ROUTE_ROLES}>
                <ItemsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/items/new"
            element={
              <RoleGuard roles={ITEMS_ROUTE_ROLES}>
                <ItemDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="/items/:id"
            element={
              <RoleGuard roles={ITEMS_ROUTE_ROLES}>
                <ItemDetailPage />
              </RoleGuard>
            }
          />

          {/* Leads (Enquiry) Module */}
          <Route
            path="/leads"
            element={
              <RoleGuard roles={LEADS_ROUTE_ROLES}>
                <LeadPage />
              </RoleGuard>
            }
          />
          <Route
            path="/leads/new"
            element={
              <RoleGuard roles={LEADS_ROUTE_ROLES}>
                <LeadDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="/leads/:id"
            element={
              <RoleGuard roles={LEADS_ROUTE_ROLES}>
                <LeadDetailPage />
              </RoleGuard>
            }
          />

          {/* Sales & CRM */}
          <Route
            path="/quotations"
            element={
              <RoleGuard roles={QUOTATIONS_ROUTE_ROLES}>
                <QuotationPage />
              </RoleGuard>
            }
          />
          <Route
            path="/quotations/new"
            element={
              <RoleGuard roles={QUOTATIONS_ROUTE_ROLES}>
                <QuotationDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="/quotations/:id"
            element={
              <RoleGuard roles={QUOTATIONS_ROUTE_ROLES}>
                <QuotationDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="/customers"
            element={
              <RoleGuard roles={CUSTOMERS_ROUTE_ROLES}>
                <CustomersPage />
              </RoleGuard>
            }
          />
          <Route
            path="/prospects"
            element={
              <RoleGuard roles={LEADS_ROUTE_ROLES}>
                <ProspectPage />
              </RoleGuard>
            }
          />
          <Route
            path="/prospects/new"
            element={
              <RoleGuard roles={LEADS_ROUTE_ROLES}>
                <ProspectDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="/prospects/:id"
            element={
              <RoleGuard roles={LEADS_ROUTE_ROLES}>
                <ProspectDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="/followups"
            element={
              <RoleGuard roles={FOLLOW_UPS_ROUTE_ROLES}>
                <FollowUpsPage />
              </RoleGuard>
            }
          />

          {/* System & Support */}
          <Route
            path="/reports"
            element={
              <RoleGuard roles={REPORTS_ROUTE_ROLES}>
                <ReportsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <RoleGuard roles={AUDIT_ROUTE_ROLES}>
                <AuditLogPage />
              </RoleGuard>
            }
          />
          <Route
            path="/announcements"
            element={
              <RoleGuard roles={ANNOUNCEMENTS_ROUTE_ROLES}>
                <AnnouncementsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/announcements/create"
            element={
              <RoleGuard roles={ANNOUNCEMENTS_ROUTE_ROLES}>
                <AnnouncementFormPage />
              </RoleGuard>
            }
          />
          <Route
            path="/announcements/:id/edit"
            element={
              <RoleGuard roles={ANNOUNCEMENTS_ROUTE_ROLES}>
                <AnnouncementFormPage />
              </RoleGuard>
            }
          />
          <Route
            path="/notifications"
            element={
              <RoleGuard roles={ALL_AUTHENTICATED_ROLES}>
                <NotificationsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <RoleGuard roles={SETTINGS_ROUTE_ROLES}>
                <SettingsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/help"
            element={
              <RoleGuard roles={ALL_AUTHENTICATED_ROLES}>
                <HelpPage />
              </RoleGuard>
            }
          />

          {/* Platform administration routes. Access remains role-guarded. */}
          <Route
            path="/platform/organizations"
            element={
              <RoleGuard roles={ORGANIZATION_ADMIN_ROUTE_ROLES}>
                <OrganizationsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/platform/signup-requests"
            element={
              <RoleGuard roles={SIGNUP_REQUESTS_ROUTE_ROLES}>
                <SignupRequestsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/platform/settings"
            element={
              <RoleGuard roles={ORGANIZATION_ADMIN_ROUTE_ROLES}>
                <PlatformSettingsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/platform/billing"
            element={
              <RoleGuard roles={ORGANIZATION_ADMIN_ROUTE_ROLES}>
                <SuperAdminBillingPage />
              </RoleGuard>
            }
          />
          <Route
            path="/platform/billing/plans/create"
            element={
              <RoleGuard roles={ORGANIZATION_ADMIN_ROUTE_ROLES}>
                <SuperAdminPlanFormPage />
              </RoleGuard>
            }
          />
          <Route
            path="/platform/billing/plans/:id/edit"
            element={
              <RoleGuard roles={ORGANIZATION_ADMIN_ROUTE_ROLES}>
                <SuperAdminPlanFormPage />
              </RoleGuard>
            }
          />
          <Route
            path="/platform/billing/:id/edit"
            element={
              <RoleGuard roles={ORGANIZATION_ADMIN_ROUTE_ROLES}>
                <SuperAdminSubscriptionFormPage />
              </RoleGuard>
            }
          />
          {/*
            Announcements are NOT a platform-administration surface — super
            admin and organization admin author them on the same page, which
            branches on role internally. They therefore live at /announcements
            for both, exactly like /audit-logs, whose role set is identical.

            These prefixed URLs were a second registration of the same
            component, reachable only by super admin. Kept as redirects so
            existing links resolve.
          */}
          <Route
            path="/super-admin/announcements"
            element={<Navigate to="/announcements" replace />}
          />
          <Route
            path="/super-admin/announcements/create"
            element={<Navigate to="/announcements/create" replace />}
          />
          <Route
            path="/super-admin/announcements/:id/edit"
            element={<LegacyPlatformRedirect />}
          />
          <Route
            path="/platform/organizations/add"
            element={
              <RoleGuard roles={ORGANIZATION_ADMIN_ROUTE_ROLES}>
                <OrganizationDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="/platform/organizations/:slug/edit"
            element={
              <RoleGuard roles={ORGANIZATION_ADMIN_ROUTE_ROLES}>
                <OrganizationDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="/platform/organizations/:slug"
            element={
              <RoleGuard roles={ORGANIZATION_ADMIN_ROUTE_ROLES}>
                <SuperAdminOrganizationWorkspacePage />
              </RoleGuard>
            }
          >
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/new" element={<UserDetailPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="items/new" element={<ItemDetailPage />} />
            <Route path="items/:id" element={<ItemDetailPage />} />
            <Route path="leads" element={<LeadPage />} />
            <Route path="leads/new" element={<LeadDetailPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
            <Route path="prospects" element={<ProspectPage />} />
            <Route path="prospects/new" element={<ProspectDetailPage />} />
            <Route path="prospects/:id" element={<ProspectDetailPage />} />
            <Route path="quotations" element={<QuotationPage />} />
            <Route path="quotations/new" element={<QuotationDetailPage />} />
            <Route path="quotations/:id" element={<QuotationDetailPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="billing" element={<OrganizationBillingPage />} />
          </Route>

          {/* Historical route aliases: canonical platform URLs stay short. */}
          <Route path="/super-admin/*" element={<LegacyPlatformRedirect />} />
          <Route path="/admin/*" element={<LegacyPlatformRedirect />} />

          {/* Profile Management */}
          <Route
            path="/profile"
            element={
              <RoleGuard roles={ALL_AUTHENTICATED_ROLES}>
                <ProfileLayout />
              </RoleGuard>
            }
          >
            <Route index element={<PersonalInfo />} />
            <Route path="change-password" element={<ChangePassword />} />
          </Route>
        </Route>
      </Route>

      {/* Retired /:orgSlug/* tenant URLs — see LegacyOrgSlugRedirect. */}
      <Route path="/:orgSlug/*" element={<LegacyOrgSlugRedirect />} />

      {/* Fallback Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
