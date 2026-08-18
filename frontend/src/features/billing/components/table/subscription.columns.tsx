import { type ColumnDef } from "@tanstack/react-table";
import { Ban, Pencil } from "lucide-react";
import ActionMenu from "@/components/common/ActionMenu";
import StatusBadge from "@/components/common/StatusBadge";
import type { SubscriptionSummary } from "@/contracts/types";
import {
  SUBSCRIPTION_STATUS_BADGE_TYPE,
  SUBSCRIPTION_STATUS_LABELS,
  formatDate,
  formatLimit,
  formatPrice,
} from "../../constants/labels";

interface SubscriptionColumnsProps {
  onEdit: (subscription: SubscriptionSummary) => void;
  onCancel: (subscription: SubscriptionSummary) => void;
}

export const getSubscriptionColumns = ({
  onEdit,
  onCancel,
}: SubscriptionColumnsProps): ColumnDef<SubscriptionSummary>[] => [
  {
    header: "Organization",
    id: "organization",
    cell: ({ row }) => (
      <p className="truncate text-sm font-medium text-foreground">
        {row.original.organizationName ?? "—"}
      </p>
    ),
  },
  {
    header: "Plan",
    id: "plan",
    cell: ({ row }) => {
      const { plan } = row.original;
      return (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {plan.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {plan.priceMinor === 0
              ? "No charge"
              : formatPrice(plan.priceMinor, plan.currency)}
          </p>
        </div>
      );
    },
  },
  {
    header: "Status",
    id: "status",
    cell: ({ row }) => {
      const { status, effectiveStatus } = row.original;

      return (
        <div className="space-y-1">
          <StatusBadge
            status={effectiveStatus}
            label={SUBSCRIPTION_STATUS_LABELS[effectiveStatus]}
            type={SUBSCRIPTION_STATUS_BADGE_TYPE[effectiveStatus]}
          />
          {/*
            The stored status and the resolved one diverge whenever a period has
            lapsed without anyone touching the row — which is normal, since
            nothing runs on a timer. Surfacing both stops the console looking
            like it is lying.
          */}
          {status !== effectiveStatus && (
            <p className="text-[11px] text-muted-foreground">
              set as {SUBSCRIPTION_STATUS_LABELS[status]}
            </p>
          )}
        </div>
      );
    },
  },
  {
    header: "Seats",
    id: "seats",
    meta: { className: "text-muted-foreground" },
    cell: ({ row }) => {
      const seats = row.original.features.find((f) => f.key === "MAX_USERS");
      const customCount = row.original.features.filter(
        (f) => f.origin === "override",
      ).length;

      return (
        <div className="text-sm">
          <span>{formatLimit(seats?.valueInt ?? null)}</span>
          {customCount > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {customCount} custom term{customCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      );
    },
  },
  {
    header: "Renews",
    id: "renews",
    meta: { className: "text-muted-foreground whitespace-nowrap" },
    cell: ({ row }) => {
      const { currentPeriodEnd, cancelAtPeriodEnd, daysRemaining } = row.original;

      return (
        <div className="text-sm">
          <p>{formatDate(currentPeriodEnd)}</p>
          {cancelAtPeriodEnd && (
            <p className="text-[11px] text-yellow-600 dark:text-yellow-400">
              will not renew
            </p>
          )}
          {!cancelAtPeriodEnd &&
            daysRemaining !== null &&
            daysRemaining <= 14 && (
              <p className="text-[11px] text-muted-foreground">
                {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left
              </p>
            )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    meta: { headerClassName: "text-right", className: "text-right" },
    cell: ({ row }) => {
      const subscription = row.original;
      const alreadyCancelled = subscription.status === "CANCELLED";

      return (
        <ActionMenu
          items={[
            {
              label: "Edit billing",
              icon: Pencil,
              onClick: () => onEdit(subscription),
              tooltip: "Assign a plan or set the paid period",
            },
            {
              label: "Cancel",
              icon: Ban,
              onClick: () => onCancel(subscription),
              variant: "destructive",
              disabled: alreadyCancelled,
              tooltip: alreadyCancelled
                ? "Already cancelled"
                : "End this subscription",
            },
          ]}
        />
      );
    },
  },
];
