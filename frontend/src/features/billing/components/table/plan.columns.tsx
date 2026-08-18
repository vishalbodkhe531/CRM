import { type ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import ActionMenu from "@/components/common/ActionMenu";
import StatusBadge from "@/components/common/StatusBadge";
import type { PlanSummary } from "@/contracts/types";
import {
  PLAN_INTERVAL_LABELS,
  formatLimit,
  formatPrice,
} from "../../constants/labels";

interface PlanColumnsProps {
  onEdit: (plan: PlanSummary) => void;
}

export const getPlanColumns = ({
  onEdit,
}: PlanColumnsProps): ColumnDef<PlanSummary>[] => [
  {
    header: "Plan",
    id: "plan",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {row.original.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {row.original.code}
        </p>
      </div>
    ),
  },
  {
    header: "Price",
    id: "price",
    meta: { className: "whitespace-nowrap" },
    cell: ({ row }) => {
      const plan = row.original;

      if (plan.priceMinor === 0) {
        return <span className="text-sm text-muted-foreground">No charge</span>;
      }

      return (
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {formatPrice(plan.priceMinor, plan.currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            per {PLAN_INTERVAL_LABELS[plan.billingCycle]}
          </p>
        </div>
      );
    },
  },
  {
    header: "Seats",
    id: "seats",
    meta: { className: "text-muted-foreground" },
    cell: ({ row }) =>
      formatLimit(
        row.original.features.find((f) => f.key === "MAX_USERS")?.valueInt ??
          null,
      ),
  },
  {
    header: "Trial",
    id: "trial",
    meta: { className: "text-muted-foreground" },
    cell: ({ row }) =>
      row.original.trialDays > 0 ? `${row.original.trialDays} days` : "—",
  },
  {
    header: "Status",
    id: "status",
    cell: ({ row }) => {
      const { isActive, isPublic } = row.original;

      return (
        <div className="space-y-1">
          <StatusBadge
            status={isActive ? "ACTIVE" : "INACTIVE"}
            label={isActive ? "Assignable" : "Retired"}
            type={isActive ? "success" : "inactive"}
          />
          {/*
            Assignable but unlisted is a real, deliberate state — enterprise and
            legacy plans live here. Showing it stops anyone "fixing" it.
          */}
          {isActive && !isPublic && (
            <p className="text-[11px] text-muted-foreground">not offered</p>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    meta: { headerClassName: "text-right", className: "text-right" },
    cell: ({ row }) => (
      <ActionMenu
        items={[
          {
            label: "Edit",
            icon: Pencil,
            onClick: () => onEdit(row.original),
            tooltip: "Edit pricing and limits",
          },
        ]}
      />
    ),
  },
];
