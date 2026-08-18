import { OrganizationBillingView } from "@/features/billing";

/**
 * Billing tab inside the super-admin organization workspace.
 * Scope comes from the workspace, which sets selectedOrganizationId on mount.
 */
const OrganizationBillingPage = () => {
  return <OrganizationBillingView />;
};

export default OrganizationBillingPage;
