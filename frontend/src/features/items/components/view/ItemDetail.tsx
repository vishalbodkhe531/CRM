import type { FC } from "react";
import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import FormHeader from "@/components/common/FormHeader";
import ItemEditForm from "../forms/ItemEditForm";
import { useItemDetail } from "../../hooks/useItems";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { useAppSelector } from "@/hooks/useRedux";
import { canAddEditItems, type UserRole } from "@/constants/roles";
import {
  isSuperAdminWorkspaceCreatePath,
  withSuperAdminOrganizationScope,
} from "@/utils/orgRoutes";

interface ItemDetailProps {
  itemId?: string;
}

const ItemDetail: FC<ItemDetailProps> = ({ itemId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role;

  const isAdding = !itemId || itemId === "new";
  const hideWorkspaceCreateHeader =
    isAdding && isSuperAdminWorkspaceCreatePath(location.pathname);
  const { data: item, isLoading, error } = useItemDetail(
    isAdding ? undefined : itemId,
  );

  const canAddEdit = canAddEditItems(role as UserRole);

  if (!canAddEdit) {
    return (
      <EmptyState
        title="Access Denied"
        description="You do not have permission to manage items."
      />
    );
  }

  if (isLoading && !isAdding)
    return <LoadingState message="Loading item details..." />;

  if (!isAdding && (error || !item))
    return (
      <EmptyState
        title="Item not found"
        description="The item you are trying to view does not exist."
      />
    );

  const displayName = isAdding ? "Add Item" : `Edit Item: ${item?.name}`;

  return (
    <div className="flex w-full flex-col h-full overflow-hidden">
      {!hideWorkspaceCreateHeader && (
        <FormHeader
          title={displayName}
          icon={Package}
          onBack={() => navigate(scopedPath("/items"))}
          className="shrink-0 px-1"
        />
      )}

      <div
        className={`flex-1 overflow-y-auto pb-6 scrollbar-hide ${
          hideWorkspaceCreateHeader ? "mt-0" : "mt-5"
        }`}
      >
        <Card className="border-border/60 bg-card p-4 sm:p-5 lg:p-6 overflow-visible h-auto leading-relaxed shadow-sm">
          <div className="h-auto overflow-visible">
            <ItemEditForm
              item={item || undefined}
              isAdding={isAdding}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ItemDetail;
