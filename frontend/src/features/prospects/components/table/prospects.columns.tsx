import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, RefreshCw, Trash } from "lucide-react";
import ActionMenu from "@/components/common/ActionMenu";
import TooltipLabel from "@/components/common/TooltipLabel";
import FollowUpHealthBadge from "@/components/common/FollowUpHealthBadge";
import StatusBadge from "@/components/common/StatusBadge";
import { PROSPECT_STAGE_LABELS } from "@/constants/labels";
import type { Prospect } from "../../types";

interface ProspectsColumnsProps {
  onView: (prospect: Prospect) => void;
  onEdit: (prospect: Prospect) => void;
  onChangeStage: (prospect: Prospect) => void;
  onDelete: (prospect: Prospect) => void;
}

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN");
};

export const getProspectsColumns = ({
  onView,
  onEdit,
  onChangeStage,
  onDelete,
}: ProspectsColumnsProps): ColumnDef<Prospect>[] => [
  {
    header: "Prospect No",
    accessorKey: "prospectNo",
    meta: {
      className:
        "whitespace-nowrap text-xs font-semibold uppercase text-muted-foreground",
    },
    cell: ({ row }) => {
      const prospect = row.original;
      return (
        <TooltipLabel label="View prospect details">
          <button
            type="button"
            onClick={() => onView(prospect)}
            className="text-blue-500 underline bg-transparent py-0.5 text-left font-semibold transition-all hover:border-foreground cursor-pointer"
          >
            {prospect.prospectNo}
          </button>
        </TooltipLabel>
      );
    },
  },
  {
    header: "Company Name",
    id: "companyName",
    meta: {
      className: "min-w-[220px]",
    },
    cell: ({ row }) => {
      const prospect = row.original;
      return (
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {prospect.lead?.companyName || "-"}
          </p>
          <p className="text-xs text-muted-foreground">
            {[prospect.lead?.firstName, prospect.lead?.lastName]
              .filter(Boolean)
              .join(" ") || "No contact"}
          </p>
        </div>
      );
    },
  },
  {
    header: "Stage",
    accessorKey: "stage",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.stage}
        label={PROSPECT_STAGE_LABELS[row.original.stage]}
      />
    ),
  },
  {
    header: "Assigned To",
    accessorKey: "assignedTo",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => {
      const user = row.original.assignedTo;
      return user ? `${user.firstName} ${user.lastName}` : "Unassigned";
    },
  },
  {
    header: "Created Date",
    accessorKey: "createdAt",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    header: "Follow-up Health",
    accessorKey: "followUpHealth",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => <FollowUpHealthBadge prospect={row.original} />,
  },
  {
    id: "actions",
    header: "Actions",
    meta: {
      headerClassName: "text-center",
      className: "text-center",
    },
    cell: ({ row }) => {
      const prospect = row.original;
      const canEdit = prospect.isEditable;

      return (
        <ActionMenu
          items={[
            {
              label: "View Details",
              icon: Eye,
              onClick: () => onView(prospect),
              tooltip: "View prospect details",
            },
            {
              label: canEdit ? "Open Workspace" : "Read-only View",
              icon: Pencil,
              onClick: () => onEdit(prospect),
              tooltip: canEdit
                ? "Open prospect workspace"
                : "View prospect read-only",
            },
            {
              label: "Change Stage",
              icon: RefreshCw,
              onClick: () => onChangeStage(prospect),
              show: canEdit,
              tooltip: "Update prospect stage",
            },
            {
              label: "Delete",
              icon: Trash,
              onClick: () => onDelete(prospect),
              show: canEdit,
              tooltip: "Delete prospect",
              variant: "destructive",
            },
          ]}
        />
      );
    },
  },
];
