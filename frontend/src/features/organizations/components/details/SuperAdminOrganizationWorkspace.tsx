import { Suspense, useEffect } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import LoadingState from "@/components/common/LoadingState";
import PageHeader from "@/components/common/PageHeader";
import PageTabs from "@/components/common/PageTabs";
import { Button } from "@/components/ui/button";
import { setSelectedOrganizationId } from "@/features/auth";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { useOrganizationBySlug, useOrganizationDetail } from "../../hooks/useOrganizations";

const ORGANIZATION_TABS = [
  { value: "users", label: "Users" },
  { value: "items", label: "Items" },
  { value: "leads", label: "Leads" },
  { value: "prospects", label: "Prospects" },
  { value: "quotations", label: "Quotations" },
  { value: "customers", label: "Customers" },
  { value: "reports", label: "Reports" },
  { value: "billing", label: "Billing" },
] as const;

const SuperAdminOrganizationWorkspace = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const selectedOrganizationId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );

  const {
    data: publicOrganization,
    isLoading: isResolvingSlug,
    error: slugError,
  } = useOrganizationBySlug(slug);

  const organizationId = publicOrganization?.id;
  const {
    data: organization,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useOrganizationDetail(organizationId);

  useEffect(() => {
    dispatch(setSelectedOrganizationId(organizationId ?? null));

    return () => {
      dispatch(setSelectedOrganizationId(null));
    };
  }, [dispatch, organizationId]);

  if (isResolvingSlug || isLoadingDetail) {
    return <LoadingState message="Loading organization workspace..." />;
  }

  if (!slug || slugError || detailError || !organization) {
    return (
      <EmptyState
        title="Organization not found"
        description="The organization you are trying to view does not exist."
      />
    );
  }

  const activeTab =
    ORGANIZATION_TABS.find((tab) =>
      location.pathname.includes(`/platform/organizations/${slug}/${tab.value}`),
    )?.value ?? "users";

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <div className="flex min-w-0 items-center gap-3">
            <Button
              className="-ml-3"
              onClick={() => navigate("/platform/organizations")}
              size="icon"
              variant="ghost"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="min-w-0 truncate">{organization.name}</span>
          </div>
        }
        description={organization.slug}
      />

      <PageTabs
        tabs={ORGANIZATION_TABS}
        value={activeTab}
        getHref={(value) => `/platform/organizations/${slug}/${value}`}
      />

      {selectedOrganizationId === organization.id ? (
        // Own Suspense boundary so loading a lazy tab chunk only swaps the tab
        // body — the org header, tab bar, and sidebar all stay put.
        <Suspense fallback={<LoadingState message="Loading..." />}>
          <Outlet />
        </Suspense>
      ) : (
        <LoadingState message="Preparing organization data..." />
      )}
    </div>
  );
};

export default SuperAdminOrganizationWorkspace;
