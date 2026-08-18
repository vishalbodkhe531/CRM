import { useMemo } from "react";
import type { User } from "../../types";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { UserStatus } from "@/constants/enums";
import { getUsersColumns } from "./users.columns";

interface UsersTableProps {
  loading: boolean;
  paginatedUsers: User[];
  canManageUsers: boolean;
  canResetPassword: boolean;
  onEditClick: (user: User) => void;
  onDisableClick: (userId: string, userName: string) => void;
  onEnableClick: (userId: string, userName: string) => void;
  onResetPasswordClick: (user: User) => void;
  onDeleteClick: (
    userId: string,
    userName: string,
    status: "ACTIVE" | "INACTIVE",
  ) => void;
}

const UsersTable = ({
  loading,
  paginatedUsers,
  canManageUsers,
  canResetPassword,
  onEditClick,
  onDisableClick,
  onEnableClick,
  onResetPasswordClick,
  onDeleteClick,
}: UsersTableProps) => {
  const columns = useMemo(
    () =>
      getUsersColumns({
        canManageUsers,
        canResetPassword,
        onEditClick,
        onDisableClick,
        onEnableClick,
        onResetPasswordClick,
        onDeleteClick,
      }),
    [
      canManageUsers,
      canResetPassword,
      onEditClick,
      onDisableClick,
      onEnableClick,
      onResetPasswordClick,
      onDeleteClick,
    ]
  );

  const table = useDataTable({
    data: paginatedUsers,
    columns,
    pageCount: -1, // Pagination handled externally in UsersView
    pagination: { pageIndex: 0, pageSize: paginatedUsers.length || 10 },
    onPaginationChange: () => { },
  });

  return (
    <DataTable
      table={table}
      className="min-w-[1120px]"
      isLoading={loading}
      loadingMessage="Loading users..."
      mobileCardRenderer={(user) => {
        const userName = [user.firstName, user.middleName, user.lastName]
          .filter(Boolean)
          .join(" ");
        return (
          <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-foreground">
                  {userName || user.email}
                </h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {user.designation || user.email}
                </p>
              </div>
              <StatusBadge status={user.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">Role</span>
              <span className="text-right font-medium text-foreground">
                {user.role}
              </span>
              <span className="text-muted-foreground">Employee ID</span>
              <span className="text-right font-medium text-foreground">
                {user.employeeId || "-"}
              </span>
              <span className="text-muted-foreground">Contact</span>
              <span className="text-right font-medium text-foreground">
                {user.mobile || "-"}
              </span>
            </div>
            {canManageUsers && (
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
                <Button size="sm" variant="outline" onClick={() => onEditClick(user)}>
                  Edit
                </Button>
                {user.status === UserStatus.ACTIVE ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDisableClick(user.id, userName)}
                  >
                    Disable
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEnableClick(user.id, userName)}
                  >
                    Enable
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteClick(user.id, userName, user.status)}
                >
                  Delete
                </Button>
              </div>
            )}
          </article>
        );
      }}
      emptyState={
        <EmptyState
          title="No users found"
          description="Try adjusting your filters or search terms."
          // className="border-none"
          className="border-none min-h-0"
        />
      }
    />
  );
};

export default UsersTable;
