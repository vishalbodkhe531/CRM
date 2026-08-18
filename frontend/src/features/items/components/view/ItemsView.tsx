import { useLocation, useNavigate } from "react-router-dom";
import { useListView } from "@/hooks/useListView";
import { useConfirm } from "@/hooks/useConfirm";
import { usePermissions } from "@/features/auth";
import { useItems } from "../../hooks/useItems";
import { useDeleteItem } from "../../hooks/useDeleteItem";
import { useToggleItemStatus } from "../../hooks/useToggleItemStatus";
import ItemsTable from "../table/ItemsTable";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { ITEM_FILTER_CONFIG } from "../../constants/filters";
import type { Item, ItemListParams } from "../../types";
import ItemsStats from "../items-stats/ItemsStats";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";

const ItemsView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const { hasPermission } = usePermissions();

  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig: ITEM_FILTER_CONFIG,
  });

  const deleteConfirm = useConfirm<Item>();
  const toggleConfirm = useConfirm<Item>();

  const { data, isLoading } = useItems(queryParams as ItemListParams);
  const items = data?.data || [];
  const meta = data?.meta;


  const { mutateAsync: deleteItemMutation, isPending: isDeleting } =
    useDeleteItem();
  const { mutateAsync: toggleItemStatusMutation, isPending: isToggling } =
    useToggleItemStatus();
  const actionLoading = isDeleting || isToggling;

  const canAddEdit = hasPermission("items:manage");
  const canDelete = hasPermission("items:delete");
  const canToggleStatus = hasPermission("items:manage");

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.data) return;
    try {
      await deleteItemMutation(deleteConfirm.data.id);
      if (items.length === 1 && queryParams.page > 1) {
        onPageChange(queryParams.page - 1);
      }
      deleteConfirm.close();
    } catch {
      // handled in mutation hook
    }
  };

  const handleConfirmToggle = async () => {
    if (!toggleConfirm.data) return;
    try {
      await toggleItemStatusMutation(toggleConfirm.data.id);
      toggleConfirm.close();
    } catch {
      // handled in mutation hook
    }
  };

  return (
    <ListViewLayout
      {...toolbarProps}
      title="Items"
      stats={<ItemsStats />}
      description="Manage your product and service catalogue"
      filterConfig={ITEM_FILTER_CONFIG}
      searchPlaceholder="Search by name, SKU..."
      addButtonLabel="+ Add Item"
      showAddButton={canAddEdit}
      onAddClick={() => navigate(scopedPath("/items/new"))}
      table={
        <ItemsTable
          loading={isLoading}
          items={items}
          canAddEdit={canAddEdit}
          canDelete={canDelete}
          canToggleStatus={canToggleStatus}
          onEditClick={(item) => navigate(scopedPath(`/items/${item.id}`))}
          onDeleteClick={deleteConfirm.open}
          onToggleStatus={toggleConfirm.open}
          isActionPending={actionLoading}
        />
      }
      meta={meta}
      onPageChange={onPageChange}
      itemLabel="items"
    >
      <ConfirmDialog
        {...deleteConfirm.confirmProps}
        title="Delete Item"
        description={`Are you sure you want to delete "${deleteConfirm.data?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        {...toggleConfirm.confirmProps}
        title={
          toggleConfirm.data?.status === "ACTIVE"
            ? "Deactivate Item"
            : "Activate Item"
        }
        description={
          toggleConfirm.data?.status === "ACTIVE"
            ? `Deactivating "${toggleConfirm.data?.name}" will hide it from product selection lists. Continue?`
            : `Activating "${toggleConfirm.data?.name}" will make it available in product selection lists. Continue?`
        }
        confirmText={
          toggleConfirm.data?.status === "ACTIVE" ? "Deactivate" : "Activate"
        }
        loading={actionLoading}
        onConfirm={handleConfirmToggle}
      />
    </ListViewLayout>
  );
};

export default ItemsView;
