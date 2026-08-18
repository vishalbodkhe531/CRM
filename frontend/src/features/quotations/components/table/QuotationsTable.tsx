import { useMemo } from "react";
import type { UserRole } from "@/constants/roles";
import type { Quotation } from "../../types";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/constants/roles";
import type { PaginationMeta } from "@/types/api";
import { getQuotationsColumns } from "./quotations.columns";

interface QuotationsTableProps {
  quotations: Quotation[];
  loading: boolean;
  onView: (quotation: Quotation) => void;
  onEdit: (quotation: Quotation) => void;
  onChangeAssignee: (quotation: Quotation) => void;
  onChangeStatus: (quotation: Quotation) => void;
  onDelete: (quotation: Quotation) => void;
  actionLoading?: boolean;
  currentRole?: UserRole;
  meta?: PaginationMeta;
}

const QuotationsTable = ({
  quotations,
  loading,
  onView,
  onEdit,
  onChangeAssignee,
  onChangeStatus,
  onDelete,
  actionLoading,
  currentRole,
  meta,
}: QuotationsTableProps) => {
  const columns = useMemo(
    () =>
      getQuotationsColumns({
        onView,
        onEdit,
        onChangeAssignee,
        onChangeStatus,
        onDelete,
        actionLoading,
        currentRole,
      }),
    [onView, onEdit, onChangeAssignee, onChangeStatus, onDelete, actionLoading, currentRole],
  );

  const table = useDataTable({
    data: quotations,
    columns,
    pageCount: meta?.totalPages || -1,
    pagination: {
      pageIndex: (meta?.page || 1) - 1,
      pageSize: meta?.limit || 10,
    },
    onPaginationChange: () => {},
  });

  return (
    <DataTable
      table={table}
      className="min-w-[1100px]"
      isLoading={loading}
      loadingMessage="Loading quotations..."
      mobileCardRenderer={(quotation) => {
        const isExecutive = currentRole === ROLES.EXECUTIVE;
        const amount = quotation.details?.grandTotal;
        return (
          <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onView(quotation)}
                className="min-w-0 text-left"
              >
                <h3 className="truncate text-sm font-bold text-foreground">
                  {quotation.quotationNo}
                </h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {quotation.partyName || quotation.refNo || "-"}
                </p>
              </button>
              <StatusBadge status={quotation.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">Date</span>
              <span className="text-right font-medium text-foreground">
                {new Date(quotation.date).toLocaleDateString("en-IN")}
              </span>
              <span className="text-muted-foreground">Ref No</span>
              <span className="text-right font-medium text-foreground">
                {quotation.refNo || "-"}
              </span>
              <span className="text-muted-foreground">Amount</span>
              <span className="text-right font-medium text-foreground">
                {typeof amount === "number" ? `Rs ${amount.toFixed(2)}` : "-"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
              <Button size="sm" variant="outline" onClick={() => onView(quotation)}>
                View
              </Button>
              <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => onEdit(quotation)}>
                Edit
              </Button>
              {!isExecutive && (
                <>
                  <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => onChangeAssignee(quotation)}>
                    Assign
                  </Button>
                  <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => onChangeStatus(quotation)}>
                    Status
                  </Button>
                  <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => onDelete(quotation)}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </article>
        );
      }}
      emptyState={
        <EmptyState
          title="No quotations found"
          description="Create a new quotation to get started."
          className="border-none"
        />
      }
    />
  );
};

export default QuotationsTable;
