import { useMemo } from "react";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import EmptyState from "@/components/common/EmptyState";
import type { PaginationMeta } from "@/types/api";
import type { Prospect } from "@/contracts/types";
import { getCustomersColumns } from "./customers.columns";

interface CustomersTableProps {
  customers: Prospect[];
  loading: boolean;
  meta?: PaginationMeta;
}

const CustomersTable = ({ customers, loading, meta }: CustomersTableProps) => {
  const columns = useMemo(() => getCustomersColumns(), []);

  const table = useDataTable({
    data: customers,
    columns,
    pageCount: meta?.totalPages || -1,
    pagination: {
      pageIndex: (meta?.page || 1) - 1,
      pageSize: meta?.limit || 10,
    },
    onPaginationChange: () => {},
  });

  return (
    <DataTable
      table={table}
      className="min-w-[1240px]"
      isLoading={loading}
      loadingMessage="Loading customers..."
      mobileCardRenderer={(customer) => {
        const lead = customer.lead;
        const customerName = [lead?.firstName, lead?.lastName]
          .filter(Boolean)
          .join(" ");
        return (
          <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="truncate text-sm font-bold text-foreground">
              {customerName || lead?.companyName || customer.prospectNo}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {lead?.companyName || "No company"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">Item</span>
              <span className="text-right font-medium text-foreground">
                {lead?.productInterest?.name || "-"}
              </span>
              <span className="text-muted-foreground">Mobile</span>
              <span className="text-right font-medium text-foreground">
                {lead?.mobile || "-"}
              </span>
              <span className="text-muted-foreground">Prospect</span>
              <span className="text-right font-medium text-foreground">
                {customer.prospectNo}
              </span>
            </div>
          </article>
        );
      }}
      emptyState={
        <EmptyState
          title="No customers found"
          description="Only prospects marked as Won will show up here."
          className="border-none"
        />
      }
    />
  );
};

export default CustomersTable;
