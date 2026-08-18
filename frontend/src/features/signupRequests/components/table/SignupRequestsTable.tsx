import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import type {
  SignupRequest,
  SignupRequestStatusPayload,
} from "../../types";
import { getSignupRequestsColumns } from "./signupRequests.columns";

interface SignupRequestsTableProps {
  requests: SignupRequest[];
  loading: boolean;
  actionLoading: boolean;
  onViewDetail: (request: SignupRequest) => void;
  onUpdateStatus: (
    request: SignupRequest,
    payload: SignupRequestStatusPayload,
  ) => void;
}

const SignupRequestsTable = ({
  requests,
  loading,
  actionLoading,
  onViewDetail,
  onUpdateStatus,
}: SignupRequestsTableProps) => {
  const columns = useMemo(
    () =>
      getSignupRequestsColumns({
        actionLoading,
        onViewDetail,
        onUpdateStatus,
      }),
    [actionLoading, onViewDetail, onUpdateStatus],
  );

  const table = useDataTable({
    data: requests,
    columns,
    pageCount: -1,
    pagination: { pageIndex: 0, pageSize: requests.length || 10 },
    onPaginationChange: () => {},
  });

  return (
    <DataTable
      table={table}
      isLoading={loading}
      loadingMessage="Loading signup requests..."
      mobileCardRenderer={(request) => (
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {request.firstName} {request.lastName}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {request.email}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-muted-foreground">Company</p>
              <p className="truncate font-bold text-foreground">
                {request.companyName}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-muted-foreground">Phone</p>
              <p className="font-bold text-foreground">
                {request.phone || "-"}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetail(request)}
            >
              Details
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading || request.status === "CONTACTED"}
              onClick={() => onUpdateStatus(request, { status: "CONTACTED" })}
            >
              Contacted
            </Button>
          </div>
        </article>
      )}
      emptyState={
        <EmptyState
          title="No signup requests found"
          description="New registration requests will appear here."
          className="border-none"
        />
      }
    />
  );
};

export default SignupRequestsTable;
