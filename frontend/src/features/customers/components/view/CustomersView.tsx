import { useMemo } from "react";
import { useListView } from "@/hooks/useListView";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import { useCustomers, useCustomerStats } from "../../hooks/useCustomers";
import CustomersStats from "../customers-stats/CustomersStats";
import CustomersTable from "../table/CustomersTable";
import { CUSTOMER_FILTER_CONFIG } from "../../constants/filters";
import type { ProspectStage } from "@/contracts/types";

export const CustomersView = () => {
  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig: CUSTOMER_FILTER_CONFIG,
  });

  const mergedParams = useMemo(
    () => ({
      ...queryParams,
      stage: "WON" as ProspectStage,
    }),
    [queryParams],
  );

  const { data: prospectsData, isLoading: isListLoading } =
    useCustomers(mergedParams);
  const { data: statsData, isLoading: isStatsLoading } = useCustomerStats();
  const customers = prospectsData?.data || [];
  const meta = prospectsData?.meta;

  return (
    <ListViewLayout
      {...toolbarProps}
      title="Customers"
      description="View and manage your converted won customers."
      filterConfig={CUSTOMER_FILTER_CONFIG}
      showFilter={false}
      stats={
        <CustomersStats
          total={statsData?.total}
          active={statsData?.active}
          inactive={statsData?.inactive}
          isLoading={isStatsLoading}
        />
      }
      searchPlaceholder="Search by Prospect No, Name, Company..."
      showAddButton={false}
      table={
        <CustomersTable
          customers={customers}
          loading={isListLoading}
          meta={meta}
        />
      }
      meta={meta}
      onPageChange={onPageChange}
      itemLabel="customers"
    />
  );
};

export default CustomersView;
