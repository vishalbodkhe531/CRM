import { useMemo } from "react";
import type { Lead } from "../../types";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { LEAD_TYPE_LABELS } from "@/constants/labels";
import { ROLES } from "@/constants/roles";
import type { PaginationMeta } from "@/types/api";
import { getLeadsColumns } from "./leads.columns";

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onChangeAssignee: (lead: Lead) => void;
  onChangeStatus: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  actionLoading?: boolean;
  meta?: PaginationMeta;
  currentRole?: string;
}

const LeadsTable = ({
  leads,
  loading,
  onView,
  onEdit,
  onChangeAssignee,
  onChangeStatus,
  onDelete,
  actionLoading,
  meta,
  currentRole,
}: LeadsTableProps) => {
  const columns = useMemo(
    () =>
      getLeadsColumns({
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
    data: leads,
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
      className="min-w-[1240px]" 
      isLoading={loading}
      loadingMessage="Loading leads..."
      mobileCardRenderer={(lead) => {
        const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
        const canDelete = currentRole !== ROLES.EXECUTIVE;
        const canChangeConverted =
          !lead.isConverted ||
          currentRole === ROLES.ADMIN ||
          currentRole === ROLES.SUPER_ADMIN;
        return (
          <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onView(lead)}
                className="min-w-0 text-left"
              >
                <h3 className="truncate text-sm font-bold text-foreground">
                  {lead.leadNo}
                </h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {leadName || lead.companyName || "Unnamed lead"}
                </p>
              </button>
              <StatusBadge status={lead.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">Company</span>
              <span className="text-right font-medium text-foreground">
                {lead.companyName || "-"}
              </span>
              <span className="text-muted-foreground">Type</span>
              <span className="text-right font-medium text-foreground">
                {LEAD_TYPE_LABELS[lead.leadType || "NEW"]}
              </span>
              <span className="text-muted-foreground">Item</span>
              <span className="text-right font-medium text-foreground">
                {lead.productInterest?.name || "-"}
              </span>
              <span className="text-muted-foreground">Assigned</span>
              <span className="text-right font-medium text-foreground">
                {lead.assignedTo
                  ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                  : "Unassigned"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
              <Button size="sm" variant="outline" onClick={() => onView(lead)}>
                View
              </Button>
              <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => onEdit(lead)}>
                Edit
              </Button>
              <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => onChangeAssignee(lead)}>
                Assign
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading || !canChangeConverted}
                onClick={() => onChangeStatus(lead)}
              >
                Status
              </Button>
              {canDelete && (
                <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => onDelete(lead)}>
                  Delete
                </Button>
              )}
            </div>
          </article>
        );
      }}
      emptyState={
        <EmptyState
          title="No leads found"
          description="Create a new lead to get started."
          className="border-none"
        />
      }
    />
  );
};

export default LeadsTable;
