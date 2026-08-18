import { useMemo } from "react";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import EmptyState from "@/components/common/EmptyState";
import FollowUpHealthBadge from "@/components/common/FollowUpHealthBadge";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { PROSPECT_STAGE_LABELS } from "@/constants/labels";
import type { PaginationMeta } from "@/types/api";
import type { Prospect } from "../../types";
import { getProspectsColumns } from "./prospects.columns";

interface ProspectsTableProps {
  prospects: Prospect[];
  loading: boolean;
  onView: (prospect: Prospect) => void;
  onEdit: (prospect: Prospect) => void;
  onChangeStage: (prospect: Prospect) => void;
  onDelete: (prospect: Prospect) => void;
  meta?: PaginationMeta;
}

const ProspectsTable = ({
  prospects,
  loading,
  onView,
  onEdit,
  onChangeStage,
  onDelete,
  meta,
}: ProspectsTableProps) => {
  const columns = useMemo(
    () => getProspectsColumns({ onView, onEdit, onChangeStage, onDelete }),
    [onView, onEdit, onChangeStage, onDelete],
  );

  const table = useDataTable({
    data: prospects,
    columns,
    pageCount: meta?.totalPages || -1,
    pagination: {
      pageIndex: (meta?.page || 1) - 1,
      pageSize: meta?.limit || 10,
    },
    onPaginationChange: () => {},
  });

  return (
    <div className="">
      <DataTable
        table={table}
        className="min-w-[1240px]"
        isLoading={loading}
        loadingMessage="Loading prospects..."
        mobileCardRenderer={(prospect) => {
          const contactName = [
            prospect.lead?.firstName,
            prospect.lead?.lastName,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onView(prospect)}
                  className="min-w-0 text-left"
                >
                  <h3 className="truncate text-sm font-bold text-foreground">
                    {prospect.prospectNo}
                  </h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {prospect.lead?.companyName || contactName || "No contact"}
                  </p>
                </button>
                <StatusBadge
                  status={prospect.stage}
                  label={PROSPECT_STAGE_LABELS[prospect.stage]}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Contact</span>
                <span className="text-right font-medium text-foreground">
                  {contactName || "-"}
                </span>
                <span className="text-muted-foreground">Assigned</span>
                <span className="text-right font-medium text-foreground">
                  {prospect.assignedTo
                    ? `${prospect.assignedTo.firstName} ${prospect.assignedTo.lastName}`
                    : "Unassigned"}
                </span>
                <span className="text-muted-foreground">Created</span>
                <span className="text-right font-medium text-foreground">
                  {new Date(prospect.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
              <div className="mt-3">
                <FollowUpHealthBadge prospect={prospect} />
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
                <Button size="sm" variant="outline" onClick={() => onView(prospect)}>
                  View
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(prospect)}>
                  {prospect.isEditable ? "Open" : "Read-only"}
                </Button>
                {prospect.isEditable && (
                  <Button size="sm" variant="outline" onClick={() => onChangeStage(prospect)}>
                    Stage
                  </Button>
                )}
                {prospect.isEditable && (
                  <Button size="sm" variant="destructive" onClick={() => onDelete(prospect)}>
                    Delete
                  </Button>
                )}
              </div>
            </article>
          );
        }}
        emptyState={
          <EmptyState
            title="No prospects found"
            description="Try adjusting search or filters."
            className="border-none"
          />
        }
      />
    </div>
  );
};

export default ProspectsTable;
