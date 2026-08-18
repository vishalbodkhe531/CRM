import { useMemo } from "react";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import type { AuditLogEntry } from "@/contracts/types";
import {
  AUDIT_ACTION_BADGE_TYPE,
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
} from "../../constants/labels";
import { getAuditColumns } from "./audit.columns";

interface AuditTableProps {
  entries: AuditLogEntry[];
  loading: boolean;
  showOrganization: boolean;
  onViewDetail: (entry: AuditLogEntry) => void;
}

const AuditTable = ({
  entries,
  loading,
  showOrganization,
  onViewDetail,
}: AuditTableProps) => {
  const columns = useMemo(
    () => getAuditColumns({ showOrganization, onViewDetail }),
    [showOrganization, onViewDetail],
  );

  // Pagination is server-side (see useListView), so the table renders one page.
  const table = useDataTable({
    data: entries,
    columns,
    pageCount: -1,
    pagination: { pageIndex: 0, pageSize: entries.length || 10 },
    onPaginationChange: () => {},
  });

  return (
    <DataTable
      table={table}
      isLoading={loading}
      loadingMessage="Loading audit trail..."
      mobileCardRenderer={(entry) => (
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {entry.actor.name ?? entry.actor.email}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
            <StatusBadge
              status={entry.action}
              label={AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
              type={AUDIT_ACTION_BADGE_TYPE[entry.action]}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-muted-foreground">Entity</p>
              <p className="font-bold text-foreground">
                {AUDIT_ENTITY_LABELS[entry.entityType] ?? entry.entityType}
              </p>
            </div>
            {showOrganization && (
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-muted-foreground">Organization</p>
                <p className="truncate font-bold text-foreground">
                  {entry.organizationName ?? "Platform"}
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end border-t border-border/60 pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetail(entry)}
            >
              View Details
            </Button>
          </div>
        </article>
      )}
      emptyState={
        <EmptyState
          title="No audit activity found"
          description="Actions will appear here as they happen."
          className="border-none"
        />
      }
    />
  );
};

export default AuditTable;
