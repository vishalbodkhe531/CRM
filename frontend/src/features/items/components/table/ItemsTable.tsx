import { useMemo } from "react";
import { DataTable } from '@/components/common/table/DataTable';
import { useDataTable } from '@/components/common/table/useDataTable';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import type { Item } from '../../types';
import { getItemsColumns } from './items.columns';

interface ItemsTableProps {
  loading: boolean;
  items: Item[];
  canAddEdit: boolean;
  canDelete: boolean;
  canToggleStatus: boolean;
  onEditClick: (item: Item) => void;
  onDeleteClick: (item: Item) => void;
  onToggleStatus: (item: Item) => void;
  isActionPending?: boolean;
}

const ItemsTable = ({
  loading,
  items,
  canAddEdit,
  canDelete,
  canToggleStatus,
  onEditClick,
  onDeleteClick,
  onToggleStatus,
  isActionPending,
}: ItemsTableProps) => {
  const columns = useMemo(
    () =>
      getItemsColumns({
        canAddEdit,
        canDelete,
        canToggleStatus,
        onEditClick,
        onDeleteClick,
        onToggleStatus,
        isActionPending,
      }),
    [canAddEdit, canDelete, canToggleStatus, onEditClick, onDeleteClick, onToggleStatus, isActionPending]
  );

  const table = useDataTable({
    data: items,
    columns,
    pageCount: -1,
    pagination: { pageIndex: 0, pageSize: items.length || 10 },
    onPaginationChange: () => {},
  });

  return (
    <DataTable 
      table={table} 
      className="min-w-full" 
      isLoading={loading}
      loadingMessage="Loading items..."
      mobileCardRenderer={(item) => (
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-foreground">
                {item.name}
              </h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {item.description || item.itemCode || "-"}
              </p>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <span className="text-muted-foreground">Type</span>
            <span className="text-right font-medium text-foreground">
              {item.itemType}
            </span>
            <span className="text-muted-foreground">HSN / SAC</span>
            <span className="text-right font-medium text-foreground">
              {item.itemType === "GOODS" ? item.hsnCode || "-" : item.sacCode || "-"}
            </span>
            <span className="text-muted-foreground">GST</span>
            <span className="text-right font-medium text-foreground">
              {item.gstRate}%
            </span>
            <span className="text-muted-foreground">Price</span>
            <span className="text-right font-medium text-foreground">
              Rs {item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          {(canAddEdit || canDelete || canToggleStatus) && (
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
              {canAddEdit && (
                <Button size="sm" variant="outline" disabled={isActionPending} onClick={() => onEditClick(item)}>
                  Edit
                </Button>
              )}
              {canToggleStatus && (
                <Button size="sm" variant="outline" disabled={isActionPending} onClick={() => onToggleStatus(item)}>
                  {item.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </Button>
              )}
              {canDelete && (
                <Button size="sm" variant="destructive" disabled={isActionPending} onClick={() => onDeleteClick(item)}>
                  Delete
                </Button>
              )}
            </div>
          )}
        </article>
      )}
      emptyState={
        <EmptyState
          title="No items found"
          description="Try adjusting your search or filters, or add a new item."
          className="border-none"
        />
      }
    />
  );
};

export default ItemsTable;
