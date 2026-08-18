import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, UserPlus, RefreshCw, Trash2 } from "lucide-react";
import ActionMenu from "@/components/common/ActionMenu";
import StatusBadge, { type StatusType } from "@/components/common/StatusBadge";
import TooltipLabel from "@/components/common/TooltipLabel";
import type { Lead } from "../../types";
import { LEAD_TYPE_LABELS } from "@/constants/labels";
import { ROLES } from "@/constants/roles";
import { cn } from "@/utils/cn";

interface LeadsColumnsProps {
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onChangeAssignee: (lead: Lead) => void;
  onChangeStatus: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  actionLoading?: boolean;
  currentRole?: string;
}

const leadStatusBadgeTypes: Record<Lead["status"], StatusType> = {
  NEW: "pending",
  ATTEMPTED_CONTACT: "orange",
  CONTACTED: "warning",
  QUALIFIED: "success",
  UNQUALIFIED: "error",
};

export const getLeadsColumns = ({
  onView,
  onEdit,
  onChangeAssignee,
  onChangeStatus,
  onDelete,
  actionLoading,
  currentRole,
}: LeadsColumnsProps): ColumnDef<Lead>[] => [
  {
    header: "Lead No",
    accessorKey: "leadNo",
    meta: {
      className:
        "whitespace-nowrap text-xs font-semibold uppercase text-muted-foreground",
    },
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <TooltipLabel label="View lead details">
          <button
            type="button"
            onClick={() => onView(lead)}
            className="text-blue-500 underline bg-transparent py-0.5 text-left font-semibold transition-all hover:border-foreground cursor-pointer"
          >
            {lead.leadNo}
          </button>
        </TooltipLabel>
      );
    },
  },
  {
    header: "Status",
    accessorKey: "status",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.status}
        type={leadStatusBadgeTypes[row.original.status]}
      />
    ),
  },
  {
    header: "Type",
    accessorKey: "leadType",
    meta: {
      className: "hidden lg:table-cell whitespace-nowrap",
      headerClassName: "hidden lg:table-cell",
    },
    cell: ({ row }) => LEAD_TYPE_LABELS[row.original.leadType || "NEW"],
  },
  {
    header: "Name",
    id: "fullName",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <span
          className={cn(
            "font-medium",
            !lead.isActive && "text-muted-foreground line-through",
          )}
        >
          {[lead.firstName, lead.lastName].filter(Boolean).join(" ")}
        </span>
      );
    },
  },
  {
    header: "Company",
    accessorKey: "companyName",
    meta: {
      className: "hidden md:table-cell min-w-[180px]",
      headerClassName: "hidden md:table-cell",
    },
    cell: ({ row }) => row.original.companyName || "-",
  },
  {
    header: "Item",
    accessorKey: "productInterest",
    meta: {
      className: "hidden md:table-cell min-w-[150px]",
      headerClassName: "hidden md:table-cell",
    },
    cell: ({ row }) => {
      const item = row.original.productInterest;
      return item ? (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{item.name}</span>
          <span className="text-[10px] text-muted-foreground">
            {item.itemCode}
          </span>
        </div>
      ) : (
        "-"
      );
    },
  },
  {
    header: "Mobile",
    accessorKey: "mobile",
    meta: {
      className: "hidden lg:table-cell whitespace-nowrap",
      headerClassName: "hidden lg:table-cell",
    },
  },
  {
    header: "Assigned To",
    accessorKey: "assignedTo",
    meta: {
      className: "hidden md:table-cell whitespace-nowrap",
      headerClassName: "hidden md:table-cell",
    },
    cell: ({ row }) => {
      const user = row.original.assignedTo;
      return user ? `${user.firstName} ${user.lastName}` : "Unassigned";
    },
  },
  {
    header: "Date",
    accessorKey: "createdAt",
    meta: {
      className: "hidden xl:table-cell whitespace-nowrap",
      headerClassName: "hidden xl:table-cell",
    },
    cell: ({ row }) => {
      const rawDate = row.original.createdAt;
      if (!rawDate) return "-";
      const date = new Date(rawDate);
      return isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
    },
  },
  {
    id: "actions",
    header: "Actions",
    meta: {
      headerClassName: "text-center",
      className: "text-center",
    },
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <ActionMenu
          disabled={actionLoading}
          items={[
            {
              label: "View Details",
              icon: Eye,
              onClick: () => onView(lead),
              tooltip: "View lead details",
            },
            {
              label: "Edit Lead",
              icon: Pencil,
              onClick: () => onEdit(lead),
              tooltip: "Edit this lead",
            },
            {
              label: "Change Assignee",
              icon: UserPlus,
              onClick: () => onChangeAssignee(lead),
              tooltip: "Assign lead owner",
            },
            {
              label: "Change Status",
              icon: RefreshCw,
              onClick: () => onChangeStatus(lead),
              disabled:
                lead.isConverted &&
                currentRole !== ROLES.ADMIN &&
                currentRole !== ROLES.SUPER_ADMIN,
              tooltip: lead.isConverted
                ? "Status cannot be changed after conversion"
                : "Update lead status",
            },
            {
              label: "Delete Lead",
              icon: Trash2,
              variant: "destructive",
              onClick: () => onDelete(lead),
              show: currentRole !== ROLES.EXECUTIVE,
              tooltip: "Delete this lead",
            },
          ]}
        />
      );
    },
  },
];
