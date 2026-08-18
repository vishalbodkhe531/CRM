import type { FC } from "react";
import { Card } from "@/components/ui/card";
import { UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import FormHeader from "@/components/common/FormHeader";
import UserEditForm from "../forms/UserEditForm";
import { useUserDetail } from "../../hooks/useUsers";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { usePermissions } from "@/features/auth";
import {
  isSuperAdminWorkspaceCreatePath,
  withSuperAdminOrganizationScope,
} from "@/utils/orgRoutes";

interface UserDetailProps {
  userId?: string;
}

const UserDetail: FC<UserDetailProps> = ({ userId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);

  const isAdding = !userId || userId === "new";
  const hideWorkspaceCreateHeader =
    isAdding && isSuperAdminWorkspaceCreatePath(location.pathname);
  const { data: user, isLoading, error } = useUserDetail(
    isAdding ? undefined : userId,
  );

  const { hasPermission } = usePermissions();
  const canManageUsers = hasPermission("users:manage");

  if (!canManageUsers) {
    return (
      <EmptyState
        title="Access Denied"
        description="You do not have permission to view or edit users."
      />
    );
  }

  if (isLoading && !isAdding)
    return <LoadingState message="Loading user details..." />;

  if (!isAdding && (error || !user))
    return (
      <EmptyState
        title="User not found"
        description="The user you are trying to view does not exist."
      />
    );

  const displayName = isAdding ? "Add User" : `Edit User: ${user?.firstName} ${user?.lastName}`;

  return (
    <div className="flex w-full flex-col h-full overflow-hidden">
      {!hideWorkspaceCreateHeader && (
        <FormHeader
          title={displayName}
          icon={UserCircle}
          onBack={() => navigate(scopedPath("/users"))}
          className="shrink-0 px-1"
          contentClassName="overflow-visible"
        />
      )}

      <div
        className={`flex-1 overflow-y-auto pb-6 scrollbar-hide ${
          hideWorkspaceCreateHeader ? "mt-0" : "mt-5"
        }`}
      >
        <Card className="border-border/60 bg-card p-4 sm:p-5 lg:p-6 overflow-visible h-auto leading-relaxed shadow-sm">
          <UserEditForm
            user={user || undefined}
            isAdding={isAdding}
          />
        </Card>
      </div>
    </div>
  );
};

export default UserDetail;
