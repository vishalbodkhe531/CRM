import { useState } from "react";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import { useListView } from "@/hooks/useListView";
import { SIGNUP_REQUEST_FILTER_CONFIG } from "../../constants/filters";
import {
  useSignupRequestDetail,
  useSignupRequests,
  useUpdateSignupRequestStatus,
} from "../../hooks/useSignupRequests";
import type {
  SignupRequest,
  SignupRequestListParams,
  SignupRequestStatusPayload,
} from "../../types";
import SignupRequestDetailDialog from "../details/SignupRequestDetailDialog";
import SignupRequestsTable from "../table/SignupRequestsTable";

const SignupRequestsView = () => {
  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig: SIGNUP_REQUEST_FILTER_CONFIG,
  });

  const [selectedRequestId, setSelectedRequestId] = useState<
    string | undefined
  >();
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading } = useSignupRequests(
    queryParams as SignupRequestListParams,
  );
  const { data: selectedRequest } = useSignupRequestDetail(selectedRequestId);
  const { mutateAsync: updateStatus, isPending: isUpdating } =
    useUpdateSignupRequestStatus();

  const requests = data?.data ?? [];
  const meta = data?.meta;

  const handleViewDetail = (request: SignupRequest) => {
    setSelectedRequestId(request.id);
    setDetailOpen(true);
  };

  const handleUpdateStatus = async (
    request: SignupRequest,
    payload: SignupRequestStatusPayload,
  ) => {
    try {
      await updateStatus({ id: request.id, data: payload });
      if (detailOpen) {
        setDetailOpen(false);
      }
    } catch {
      // Error handled in hook.
    }
  };

  return (
    <ListViewLayout
      {...toolbarProps}
      title="Signup Requests"
      description="Review registration requests before manually onboarding organizations"
      filterConfig={SIGNUP_REQUEST_FILTER_CONFIG}
      searchPlaceholder="Search by name, email, phone, or company..."
      showAddButton={false}
      table={
        <SignupRequestsTable
          requests={requests}
          loading={isLoading}
          actionLoading={isUpdating}
          onViewDetail={handleViewDetail}
          onUpdateStatus={handleUpdateStatus}
        />
      }
      meta={meta}
      onPageChange={onPageChange}
      itemLabel="requests"
    >
      <SignupRequestDetailDialog
        request={selectedRequest ?? null}
        open={detailOpen}
        loading={isUpdating}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedRequestId(undefined);
        }}
        onUpdateStatus={handleUpdateStatus}
      />
    </ListViewLayout>
  );
};

export default SignupRequestsView;
