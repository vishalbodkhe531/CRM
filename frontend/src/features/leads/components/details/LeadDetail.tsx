import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLeadDetail } from "../../hooks/useLeadDetail";
import LeadFormContainer from "../forms/LeadFormContainer";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import {
  isSuperAdminWorkspaceCreatePath,
  withSuperAdminOrganizationScope,
} from "@/utils/orgRoutes";

const LeadDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);

  const modeParam = searchParams.get("mode");
  const isCreate = !id || id === "new";
  const hideWorkspaceCreateHeader =
    isCreate && isSuperAdminWorkspaceCreatePath(location.pathname);
  
  // Explicit mode detection
  const mode = isCreate ? "create" : modeParam === "edit" ? "edit" : "view";

  // Only fetch if not in create mode
  const { data: lead, isLoading, error } = useLeadDetail(isCreate ? undefined : id);

  const handleCancelClick = () => {
    if (isCreate || mode === "view") {
      navigate(scopedPath("/leads"));
    } else {
      setSearchParams({}); // Return to view mode from edit
    }
  };

  if (isLoading && !isCreate) {
    return <LoadingState message="Loading lead details..." />;
  }

  if (error && !isCreate) {
    return (
      <EmptyState
        title="Error loading lead"
        description="There was an error fetching the lead details. Please try again later."
      />
    );
  }

  if (!isCreate && !lead) {
    return (
      <EmptyState
        title="Lead not found"
        description="The lead you are trying to view does not exist."
      />
    );
  }

  return (
    <LeadFormContainer 
      mode={mode as "view" | "edit" | "create"} 
      lead={lead ?? undefined} 
      onCancel={handleCancelClick}
      hideHeader={hideWorkspaceCreateHeader}
    />
  );
};

export default LeadDetail;
