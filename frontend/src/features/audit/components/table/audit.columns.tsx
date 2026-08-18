import { type ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import ActionMenu from "@/components/common/ActionMenu";
import StatusBadge from "@/components/common/StatusBadge";
import type { AuditLogEntry } from "@/contracts/types";
import {
  AUDIT_ACTION_BADGE_TYPE,
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
} from "../../constants/labels";

interface AuditColumnsProps {
  showOrganization: boolean;
  onViewDetail: (entry: AuditLogEntry) => void;
}

export const getAuditColumns = ({
  showOrganization,
  onViewDetail,
}: AuditColumnsProps): ColumnDef<AuditLogEntry>[] => {
  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      header: "When",
      accessorKey: "createdAt",
      meta: { className: "text-muted-foreground whitespace-nowrap" },
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleString("en-IN"),
    },
    {
      header: "Action",
      accessorKey: "action",
      cell: ({ row }) => {
        const { action } = row.original;
        return (
          <StatusBadge
            status={action}
            label={AUDIT_ACTION_LABELS[action] ?? action}
            type={AUDIT_ACTION_BADGE_TYPE[action]}
          />
        );
      },
    },
    {
      header: "Actor",
      id: "actor",
      cell: ({ row }) => {
        const { actor } = row.original;
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {actor.name ?? actor.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {actor.email}
            </p>
          </div>
        );
      },
    },
    {
      header: "Entity",
      accessorKey: "entityType",
      meta: { className: "text-muted-foreground" },
      cell: ({ row }) =>
        AUDIT_ENTITY_LABELS[row.original.entityType] ??
        row.original.entityType,
    },
  ];

  // Only meaningful for super-admin: an org admin's rows are all their own org.
  if (showOrganization) {
    columns.push({
      header: "Organization",
      id: "organization",
      meta: { className: "text-muted-foreground" },
      cell: ({ row }) => row.original.organizationName ?? "Platform",
    });
  }

  columns.push({
    id: "actions",
    header: "Details",
    meta: {
      headerClassName: "text-right",
      className: "text-right",
    },
    cell: ({ row }) => (
      <ActionMenu
        items={[
          {
            label: "View Details",
            icon: Eye,
            onClick: () => onViewDetail(row.original),
            tooltip: "View before and after values",
          },
        ]}
      />
    ),
  });

  return columns;
};
