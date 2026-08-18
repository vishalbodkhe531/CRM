import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import EmptyState from "@/components/common/EmptyState";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import { useListView } from "@/hooks/useListView";
import type { PlanSummary } from "@/contracts/types";
import { usePlans } from "../../hooks/useBilling";
import { getPlanColumns } from "../table/plan.columns";
import type { PlanListParams } from "../../types";

const PlansView = () => {
  const navigate = useNavigate();
  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig: [],
  });

  const params: PlanListParams = {
    ...(queryParams as PlanListParams),
    includeInactive: true,
    includePrivate: true,
  };

  const { data, isLoading } = usePlans(params);
  const plans = data?.data ?? [];

  const handleCreate = useCallback(() => {
    navigate("/platform/billing/plans/create");
  }, [navigate]);

  const handleEdit = useCallback(
    (plan: PlanSummary) => {
      navigate(`/platform/billing/plans/${plan.id}/edit`);
    },
    [navigate],
  );

  const columns = useMemo(
    () => getPlanColumns({ onEdit: handleEdit }),
    [handleEdit],
  );

  const table = useDataTable({
    data: plans,
    columns,
    pageCount: -1,
    pagination: { pageIndex: 0, pageSize: plans.length || 10 },
    onPaginationChange: () => {},
  });

  return (
    <ListViewLayout
      {...toolbarProps}
      title="Plans"
      description="The price list. Shared across every organization."
      searchPlaceholder="Search plans..."
      addButtonLabel="New Plan"
      showFilter={false}
      onAddClick={handleCreate}
      table={
        <DataTable
          table={table}
          isLoading={isLoading}
          loadingMessage="Loading plans..."
          emptyState={
            <EmptyState
              title="No plans yet"
              description="Create a plan to start assigning it to organizations."
              className="border-none"
            />
          }
        />
      }
      meta={data?.meta}
      onPageChange={onPageChange}
      itemLabel="plans"
    />
  );
};

export default PlansView;
