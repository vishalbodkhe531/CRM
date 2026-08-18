import { type ColumnDef } from "@tanstack/react-table";
import { Edit, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import ActionMenu, {
  type ActionMenuItem,
} from "@/components/common/ActionMenu";
// import StatusBadge from '@/components/common/StatusBadge';
import type { Item } from "../../types";
import StatusBadge from "@/components/common/StatusBadge";

interface ItemsColumnsProps {
  canAddEdit: boolean;
  canDelete: boolean;
  canToggleStatus: boolean;
  onEditClick: (item: Item) => void;
  onDeleteClick: (item: Item) => void;
  onToggleStatus: (item: Item) => void;
  isActionPending?: boolean;
}

export const getItemsColumns = ({
  canAddEdit,
  canDelete,
  canToggleStatus,
  onEditClick,
  onDeleteClick,
  onToggleStatus,
  isActionPending,
}: ItemsColumnsProps): ColumnDef<Item>[] => {
  const columns: ColumnDef<Item>[] = [
    {
      header: "Name",
      accessorKey: "name",
      meta: {
        className: "min-w-52",
      },
      cell: ({ row }) => { 
        const item = row.original;
        return (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground">
              {item.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {item.description || item.itemCode || "-"}
            </span>
          </div>
        );
      },
    },
    {
      header: "Code (SKU)",
      accessorKey: "itemCode",
      meta: {
        className:
          "whitespace-nowrap text-xs font-semibold uppercase text-muted-foreground",
      },
      cell: ({ row }) => row.original.itemCode || "-",
    },
    {
      header: "Type",
      accessorKey: "itemType",
      meta: {
        className: "whitespace-nowrap",
      },
      cell: ({ row }) => (
        <span className="capitalize">{row.original.itemType}</span>
      ),
    },
    {
      header: "HSN / SAC",
      id: "code",
      meta: {
        className: "min-w-[120px] whitespace-nowrap",
      },
      cell: ({ row }) => {
        const item = row.original;
        return item.itemType === "GOODS"
          ? (item.hsnCode ?? "-")
          : (item.sacCode ?? "-");
      },
    },
    {
      header: "GST Rate",
      accessorKey: "gstRate",
      meta: {
        className: "whitespace-nowrap",
      },
      cell: ({ row }) => `${row.original.gstRate}%`,
    },
    {
      header: "Price (Rs)",
      accessorKey: "price",
      meta: {
        className: "whitespace-nowrap",
      },
      cell: ({ row }) =>
        `₹${row.original.price.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })}`,
    },
    {
      header: "Status",
      accessorKey: "status",
      meta: {
        className: "whitespace-nowrap",
      },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];

  if (canAddEdit || canDelete || canToggleStatus) {
    columns.push({
      id: "actions",
      header: "Actions",
      meta: {
        headerClassName: "text-center",
        className: "text-center whitespace-nowrap",
      },
      cell: ({ row }) => {
        const item = row.original;
        const menuItems: ActionMenuItem[] = [];

        if (canAddEdit) {
          menuItems.push({
            label: "Edit",
            icon: Edit,
            onClick: () => onEditClick(item),
            disabled: isActionPending,
            tooltip: "Edit this item",
          });
        }

        if (canToggleStatus) {
          menuItems.push({
            label: item.status === "ACTIVE" ? "Deactivate" : "Activate",
            icon: item.status === "ACTIVE" ? ToggleLeft : ToggleRight,
            onClick: () => onToggleStatus(item),
            disabled: isActionPending,
            tooltip:
              item.status === "ACTIVE"
                ? "Deactivate this item"
                : "Activate this item",
          });
        }

        if (canDelete) {
          menuItems.push({
            label: "Delete",
            icon: Trash2,
            variant: "destructive",
            onClick: () => onDeleteClick(item),
            disabled: isActionPending,
            tooltip: "Delete this item",
          });
        }

        return <ActionMenu items={menuItems} />;
      },
    });
  }

  return columns;
};
