import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import QuotationForm from "../forms/QuotationForm";
import { useQuotationDetail } from "../../hooks/useQuotations";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import {
  isSuperAdminWorkspaceCreatePath,
  withSuperAdminOrganizationScope,
} from "@/utils/orgRoutes";

const QuotationDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const isEdit = searchParams.get("edit") === "true";

  const isCreate = !id || id === "new";
  const hideWorkspaceCreateHeader =
    isCreate && isSuperAdminWorkspaceCreatePath(location.pathname);
  const { data: rawQuotation, isLoading, error } = useQuotationDetail(isCreate ? undefined : id);

  const quotation = rawQuotation ? {
    ...rawQuotation,
    assignedTo: rawQuotation.assignedTo ?? null,
  } : undefined;

  const handleCancel = () => {
    navigate(scopedPath("/quotations"));
  };

  if (isLoading && !isCreate) {
    return <LoadingState message="Loading quotation details..." />;
  }

  if (error && !isCreate) {
    return (
      <EmptyState
        title="Error loading quotation"
        description="There was an error fetching the quotation details. Please try again later."
      />
    );
  }

  if (!isCreate && !quotation) {
    return (
      <EmptyState
        title="Quotation not found"
        description="The quotation you are trying to view does not exist."
      />
    );
  }

  const isEditableStatus = !quotation || quotation.status === "PENDING";
  const mode = isCreate || (isEdit && isEditableStatus) ? "create" : "view";

  return (
    <div className="flex w-full flex-col h-full overflow-hidden">
      {isEdit && !isEditableStatus && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 text-sm" role="alert">
          <p><strong>Read-only mode:</strong> This quotation is currently {quotation.status}. Return it to PENDING to edit its contents.</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto pb-8 mt-2 scrollbar-hide">
        <QuotationForm 
          onCancel={handleCancel}
          quotation={quotation ?? undefined}
          mode={mode}
          hideHeaderIdentity={hideWorkspaceCreateHeader}
        />
      </div>
    </div>
  );
};

export default QuotationDetail;
