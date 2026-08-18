import { type ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Eye, MessageCircle, XCircle } from "lucide-react";
import ActionMenu from "@/components/common/ActionMenu";
import StatusBadge from "@/components/common/StatusBadge";
import type {
  SignupRequest,
  SignupRequestStatusPayload,
} from "../../types";

interface SignupRequestsColumnsProps {
  actionLoading: boolean;
  onViewDetail: (request: SignupRequest) => void;
  onUpdateStatus: (
    request: SignupRequest,
    payload: SignupRequestStatusPayload,
  ) => void;
}

export const getSignupRequestsColumns = ({
  actionLoading,
  onViewDetail,
  onUpdateStatus,
}: SignupRequestsColumnsProps): ColumnDef<SignupRequest>[] => [
  {
    header: "Name",
    id: "name",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {row.original.firstName} {row.original.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {row.original.email}
        </p>
      </div>
    ),
  },
  {
    header: "Phone",
    accessorKey: "phone",
    meta: { className: "text-muted-foreground whitespace-nowrap" },
    cell: ({ row }) => row.original.phone || "-",
  },
  {
    header: "Company",
    accessorKey: "companyName",
    meta: { className: "font-medium" },
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    header: "Submitted",
    accessorKey: "createdAt",
    meta: { className: "text-muted-foreground whitespace-nowrap" },
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-IN"),
  },
  {
    id: "actions",
    header: "Actions",
    meta: {
      headerClassName: "text-right",
      className: "text-right",
    },
    cell: ({ row }) => {
      const request = row.original;
      return (
        <ActionMenu
          disabled={actionLoading}
          items={[
            {
              label: "View Details",
              icon: Eye,
              onClick: () => onViewDetail(request),
              tooltip: "Open request details",
            },
            {
              label: "Mark Contacted",
              icon: MessageCircle,
              onClick: () => onUpdateStatus(request, { status: "CONTACTED" }),
              disabled: actionLoading || request.status === "CONTACTED",
              tooltip: "Mark this request as contacted",
            },
            {
              label: "Approve",
              icon: CheckCircle2,
              onClick: () => onUpdateStatus(request, { status: "APPROVED" }),
              disabled: actionLoading || request.status === "APPROVED",
              tooltip: "Mark this request as approved",
            },
            {
              label: "Reject",
              icon: XCircle,
              variant: "destructive",
              onClick: () => onUpdateStatus(request, { status: "REJECTED" }),
              disabled: actionLoading || request.status === "REJECTED",
              tooltip: "Mark this request as rejected",
            },
          ]}
        />
      );
    },
  },
];
