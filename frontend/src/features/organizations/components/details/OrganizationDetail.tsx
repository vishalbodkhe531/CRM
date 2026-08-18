import { useEffect, type FC } from "react";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Building } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OrganizationEditForm from "../forms/OrganizationEditForm";
import {
  useOrganizationBySlug,
  useOrganizationDetail,
} from "../../hooks/useOrganizations";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { useAppDispatch } from "@/hooks/useRedux";
import { setSelectedOrganizationId } from "@/features/auth";

interface OrganizationDetailProps {
  organizationSlug?: string;
  forceEditing?: boolean;
}

const OrganizationDetail: FC<OrganizationDetailProps> = ({
  organizationSlug,
  forceEditing = false,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdding = !organizationSlug || organizationSlug === "add";
  const {
    data: publicOrganization,
    isLoading: isResolvingSlug,
    error: slugError,
  } = useOrganizationBySlug(isAdding ? undefined : organizationSlug);
  const resolvedOrganizationId = publicOrganization?.id;
  const {
    data: organization,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useOrganizationDetail(
    isAdding ? undefined : resolvedOrganizationId,
  );

  const isEditing = forceEditing || searchParams.get("mode") === "edit" || isAdding;

  /**
   * Scope into the tenant while this page is open, and out again on the way
   * back. The cleanup is what stops the org id from following the super admin
   * onto later platform pages, where the interceptor would keep stamping
   * x-organization-id and feature gates would answer for the wrong tenant.
   *
   * Same pattern as SuperAdminOrganizationWorkspace.
   */
  useEffect(() => {
    if (!resolvedOrganizationId) return;

    dispatch(setSelectedOrganizationId(resolvedOrganizationId));

    return () => {
      dispatch(setSelectedOrganizationId(null));
    };
  }, [dispatch, resolvedOrganizationId]);

  const setIsEditing = (edit: boolean) => {
    if (isAdding) {
      navigate("/platform/organizations");
      return;
    }
    if (!edit && forceEditing) {
      navigate("/platform/organizations");
      return;
    }
    if (edit) setSearchParams({ mode: "edit" });
    else setSearchParams({});
  };

  if (!isAdding && (isResolvingSlug || isLoadingDetail))
    return <LoadingState message="Loading organization details..." />;

  if (!isAdding && (slugError || detailError || !organization))
    return (
      <EmptyState
        title="Organization not found"
        description="The organization you are trying to view does not exist."
      />
    );

  const displayName = isAdding
    ? "Add New Organization"
    : organization?.name ?? publicOrganization?.name;

  return (
    <div className="flex h-[calc(100vh-20px)] w-full flex-col overflow-hidden lg:h-[calc(100vh-40px)]">
      <div className="shrink-0">
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/platform/organizations")}
                className="-ml-3"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building className="h-6 w-6" />
              </div>
              <span className="ml-2 max-w-50 truncate sm:max-w-md">
                {displayName}
              </span>
            </div>
          }
        />
      </div>

      <div className="mt-6 flex-1 overflow-hidden pb-4">
        <Card className="flex h-full flex-col overflow-hidden border-border/60 bg-card shadow-sm">
          <div className="flex h-full flex-col overflow-hidden p-5 sm:p-6 lg:p-8">
            <OrganizationEditForm
              organization={organization || undefined}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              isAdding={isAdding}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OrganizationDetail;
