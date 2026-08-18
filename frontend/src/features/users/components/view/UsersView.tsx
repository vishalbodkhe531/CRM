import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useListView } from "@/hooks/useListView";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import UsersTable from "../table/UsersTable";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import type { SelectedUser } from "../../types/usersView.types";
import { useUsers } from "../../hooks/useUsers";
import {
  useDeleteUser,
  useDisableUser,
  useEnableUser,
  useResetUserPassword,
} from "../../hooks/useUserMutations";
import { useAppSelector } from "@/hooks/useRedux";
import { selectCurrentUser, usePermissions } from "@/features/auth";
import { type UserRole } from "@/contracts/types";
import type { UserListParams } from "../../types";
import { getUserFilterConfig } from "../../constants/filters";
import UsersStats from "../user-stats/UsersStats";
import TemporaryPasswordDialog from "../details/TemporaryPasswordDialog";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";
import { ROLES } from "@/constants/roles";

const UsersView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const user = useAppSelector(selectCurrentUser);
  const userFilterConfig = useMemo(
    () => getUserFilterConfig(user?.role as UserRole),
    [user?.role],
  );

  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig: userFilterConfig,
  });

  const confirm = useConfirm<
    SelectedUser & { action: "DISABLE" | "ENABLE" | "DELETE" | "RESET" }
  >();

  // Held in component state only — the temporary password is returned once by
  // the API and is deliberately never written to the query cache.
  const [resetResult, setResetResult] = useState<{
    name: string;
    temporaryPassword: string;
  } | null>(null);

  const { data, isLoading } = useUsers(queryParams as UserListParams);
  const users = data?.data || [];
  const meta = data?.meta;

  const { mutateAsync: disableUserById, isPending: isDisabling } =
    useDisableUser();
  const { mutateAsync: enableUserById, isPending: isEnabling } =
    useEnableUser();
  const { mutateAsync: deleteUserById, isPending: isDeleting } =
    useDeleteUser();
  const { mutateAsync: resetPasswordById, isPending: isResetting } =
    useResetUserPassword();
  const actionLoading = isDisabling || isEnabling || isDeleting || isResetting;

  const { hasPermission } = usePermissions();
  const canManageUsers = hasPermission("users:manage");
  // Password reset is super-admin only; the backend rejects anyone else, so
  // showing it more widely would only surface a guaranteed 403.
  const canResetPassword = user?.role === ROLES.SUPER_ADMIN;
  const pageTitle = user?.role === "MANAGER" ? "Executives" : "Users";
  const pageDescription =
    pageTitle === "Executives"
      ? "Manage your executive team members"
      : "Manage your team members and their access";

  const handleConfirmAction = async () => {
    if (!confirm.data) return;

    if (confirm.data.action === "DISABLE") {
      await disableUserById(confirm.data.id);
    } else if (confirm.data.action === "ENABLE") {
      await enableUserById(confirm.data.id);
    } else if (confirm.data.action === "RESET") {
      const name = confirm.data.name || "This user";
      const result = await resetPasswordById(confirm.data.id);
      // Close the confirmation before revealing, so the two dialogs never stack.
      confirm.close();
      setResetResult({ name, temporaryPassword: result.temporaryPassword });
      return;
    } else {
      await deleteUserById(confirm.data.id);
    }

    confirm.close();
  };

  return (
    <div className="">
      <ListViewLayout
        {...toolbarProps}
        title={pageTitle}
        stats={<UsersStats />}
        description={pageDescription}
        filterConfig={userFilterConfig}
        searchPlaceholder="Search User by name or email..."
        addButtonLabel={
          pageTitle === "Executives" ? "+ Add Executive" : "+ Add User"
        }
        showAddButton={canManageUsers}
        onAddClick={() => navigate(scopedPath("/users/new"))}
        table={
          <UsersTable
            loading={isLoading}
            paginatedUsers={users}
            canManageUsers={canManageUsers}
            canResetPassword={canResetPassword}
            onEditClick={(user) => navigate(scopedPath(`/users/${user.id}`))}
            onResetPasswordClick={(target) =>
              confirm.open({
                id: target.id,
                name: [target.firstName, target.lastName]
                  .filter(Boolean)
                  .join(" "),
                status: target.status,
                action: "RESET",
              })
            }
            onDisableClick={(id, name) =>
              confirm.open({ id, name, status: "ACTIVE", action: "DISABLE" })
            }
            onEnableClick={(id, name) =>
              confirm.open({ id, name, status: "INACTIVE", action: "ENABLE" })
            }
            onDeleteClick={(id, name, status) =>
              confirm.open({ id, name, status, action: "DELETE" })
            }
          />
        }
        meta={meta}
        onPageChange={onPageChange}
        itemLabel="users"
      >
        <ConfirmDialog
          {...confirm.confirmProps}
          title={
            confirm.data?.action === "DISABLE"
              ? "Disable User"
              : confirm.data?.action === "ENABLE"
                ? "Enable User"
                : confirm.data?.action === "RESET"
                  ? "Reset Password"
                  : "Delete User"
          }
          description={
            confirm.data?.action === "DISABLE"
              ? `Are you sure you want to disable ${confirm.data?.name || "this user"}? This action can be reversed later.`
              : confirm.data?.action === "ENABLE"
                ? `Are you sure you want to enable ${confirm.data?.name || "this user"}? They will regain access to the system.`
                : confirm.data?.action === "RESET"
                  ? `This will set a new temporary password for ${confirm.data?.name || "this user"} and sign them out of every device immediately. The password is shown only once.`
                  : `Are you sure you want to delete ${confirm.data?.name || "this user"}? This will mark the user as inactive.`
          }
          confirmText={
            confirm.data?.action === "DISABLE"
              ? "Disable"
              : confirm.data?.action === "ENABLE"
                ? "Enable"
                : confirm.data?.action === "RESET"
                  ? "Reset Password"
                  : "Delete"
          }
          cancelText="Cancel"
          onConfirm={handleConfirmAction}
          loading={actionLoading}
          variant={
            confirm.data?.action === "ENABLE" ? "default" : "destructive"
          }
        />

        <TemporaryPasswordDialog
          open={Boolean(resetResult)}
          onOpenChange={(open) => !open && setResetResult(null)}
          userName={resetResult?.name ?? "The user"}
          temporaryPassword={resetResult?.temporaryPassword ?? ""}
        />
      </ListViewLayout>
    </div>
  );
};

export default UsersView;
