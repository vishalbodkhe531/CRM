import ActionMenu from "@/components/common/ActionMenu";
import StatusBadge from "@/components/common/StatusBadge";
import { ROLES, type UserRole } from "@/constants/roles";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, RefreshCw, Trash2, UserPlus } from "lucide-react";
import type { Quotation } from "../../types";

interface QuotationsColumnsProps {
  onView: (quotation: Quotation) => void;
  onEdit: (quotation: Quotation) => void;
  onChangeAssignee: (quotation: Quotation) => void;
  onChangeStatus: (quotation: Quotation) => void;
  onDelete: (quotation: Quotation) => void;
  actionLoading?: boolean;
  currentRole?: UserRole;
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export const getQuotationsColumns = ({
  onView,
  onEdit,
  onChangeAssignee,
  onChangeStatus,
  onDelete,
  actionLoading,
  currentRole,
}: QuotationsColumnsProps): ColumnDef<Quotation>[] => [
  {
    header: "Date",
    accessorKey: "date",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    header: "Ref No",
    accessorKey: "refNo",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => row.original.refNo || "-",
  },
  {
    header: "Party Name",
    accessorKey: "partyName",
    meta: {
      className: "whitespace-nowrap min-w-[160px]",
    },
    cell: ({ row }) => row.original.partyName || "-",
  },
  {
    header: "Amount",
    accessorKey: "details.grandTotal",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => {
      const amount = row.original.details?.grandTotal;
      return typeof amount === "number" ? `₹${amount.toFixed(2)}` : "-";
    },
  },
  {
    header: "Status",
    accessorKey: "status",
    meta: {
      className: "whitespace-nowrap",
    },
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: "Actions",
    meta: {
      headerClassName: "text-center",
      className: "text-center",
    },
    cell: ({ row }) => {
      const q = row.original;
      const isExecutive = currentRole === ROLES.EXECUTIVE;
      return (
        <ActionMenu
          disabled={actionLoading}
          items={[
            {
              label: "View Details",
              icon: Eye,
              onClick: () => onView(q),
              tooltip: "View quotation details",
            },
            {
              label: "Edit",
              icon: Pencil,
              onClick: () => onEdit(q),
              tooltip: "Edit this quotation",
            },
            {
              label: "Change Assignee",
              icon: UserPlus,
              onClick: () => onChangeAssignee(q),
              show: !isExecutive,
              tooltip: "Assign quotation owner",
            },
            {
              label: "Change Status",
              icon: RefreshCw,
              onClick: () => onChangeStatus(q),
              show: !isExecutive,
              tooltip: "Update quotation status",
            },
            {
              label: "Delete Quotation",
              icon: Trash2,
              variant: "destructive",
              onClick: () => onDelete(q),
              show: !isExecutive,
              tooltip: "Delete this quotation",
            },
          ]}
        />
      );
    },
  },
];
