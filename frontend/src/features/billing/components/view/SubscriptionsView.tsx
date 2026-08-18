import { useCallback, useMemo, useState } from "react";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import EmptyState from "@/components/common/EmptyState";
import { useListView } from "@/hooks/useListView";
import type { FilterConfigItem } from "@/types/filter.types";
import {
  SUBSCRIPTION_STATUSES,
  type SubscriptionSummary,
} from "@/contracts/types";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import {
  useCancelSubscription,
  useOrganizationsWithoutSubscription,
  useSubscriptions,
} from "../../hooks/useBillingConsole";
import { SUBSCRIPTION_STATUS_LABELS } from "../../constants/labels";
import { getSubscriptionColumns } from "../table/subscription.columns";
import type { SubscriptionListParams } from "../../types";

const FILTER_CONFIG: FilterConfigItem[] = [
  {
    type: "checkbox-group",
    name: "status",
    label: "Status",
    options: SUBSCRIPTION_STATUSES.map((status) => ({
      label: SUBSCRIPTION_STATUS_LABELS[status],
      value: status,
    })),
  },
];

/**
 * Platform-wide subscriptions console.
 *
 * The status filter resolves EFFECTIVE status server-side: a subscription whose
 * period lapsed without anyone touching it is stored as ACTIVE but filtered and
 * shown as EXPIRED. The table still surfaces the stored value per row so an
 * operator can see when the two diverge.
 */
const SubscriptionsView = () => {
  const navigate = useNavigate();
  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig: FILTER_CONFIG,
  });

  const { data, isLoading } = useSubscriptions(
    queryParams as SubscriptionListParams,
  );
  const { data: unsubscribedData } = useOrganizationsWithoutSubscription();
  const unsubscribed = unsubscribedData?.data ?? [];

  const cancelSubscription = useCancelSubscription();

  const [cancelling, setCancelling] = useState<SubscriptionSummary | null>(null);

  const subscriptions = data?.data ?? [];

  const handleEdit = useCallback(
    (subscription: SubscriptionSummary) =>
      navigate(`/platform/billing/${subscription.organizationId}/edit`),
    [navigate],
  );
  const handleCancel = useCallback(
    (subscription: SubscriptionSummary) => setCancelling(subscription),
    [],
  );

  const columns = useMemo(
    () => getSubscriptionColumns({ onEdit: handleEdit, onCancel: handleCancel }),
    [handleEdit, handleCancel],
  );

  const table = useDataTable({
    data: subscriptions,
    columns,
    pageCount: -1,
    pagination: { pageIndex: 0, pageSize: subscriptions.length || 10 },
    onPaginationChange: () => {},
  });

  const confirmCancel = () => {
    if (!cancelling) return;

    cancelSubscription.mutate(
      {
        organizationId: cancelling.organizationId,
        // Default to honouring paid-for time; an immediate cut-off is a
        // separate, deliberate act rather than the default click.
        payload: { atPeriodEnd: true },
      },
      { onSettled: () => setCancelling(null) },
    );
  };

  return (
    <ListViewLayout
      {...toolbarProps}
      title="Subscriptions"
      description="Every organization's plan and paid-for period"
      filterConfig={FILTER_CONFIG}
      searchPlaceholder="Search by organization name or slug..."
      showAddButton={false}
      stats={
        unsubscribed.length > 0 ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-100/60 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700 dark:text-yellow-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                  {unsubscribed.length} organization
                  {unsubscribed.length === 1 ? "" : "s"} without a subscription
                </p>
                <p className="mt-1 text-sm text-yellow-800/90 dark:text-yellow-300/80">
                  These organizations have no plan assigned and are not enforced.
                  Open each one's billing tab to assign a plan.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {unsubscribed.map((org) => (
                    <Link
                      key={org.id}
                      to={`/platform/organizations/${org.slug}/billing`}
                      className="rounded-lg border border-yellow-300 bg-background/60 px-2.5 py-1 text-xs font-medium text-yellow-900 hover:bg-background dark:border-yellow-700 dark:text-yellow-200"
                    >
                      {org.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : undefined
      }
      table={
        <DataTable
          table={table}
          isLoading={isLoading}
          loadingMessage="Loading subscriptions..."
          emptyState={
            <EmptyState
              title="No subscriptions found"
              description="Organizations get a subscription automatically."
              className="border-none"
            />
          }
        />
      }
      meta={data?.meta}
      onPageChange={onPageChange}
      itemLabel="subscriptions"
    >
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancel this subscription?"
        description={
          cancelling
            ? `${cancelling.organizationName ?? "This organization"} keeps access until ${
                cancelling.currentPeriodEnd
                  ? new Date(cancelling.currentPeriodEnd).toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short", year: "numeric" },
                    )
                  : "the end of the current period"
              }, then becomes read-only. They will still be able to sign in and export their data.`
            : ""
        }
        confirmText="Cancel subscription"
        cancelText="Keep it"
        variant="destructive"
        loading={cancelSubscription.isPending}
        onConfirm={confirmCancel}
      />
    </ListViewLayout>
  );
};

export default SubscriptionsView;
