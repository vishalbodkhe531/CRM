import { type ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, Edit, KeyRound, Trash2 } from "lucide-react";
import ActionMenu, { type ActionMenuItem } from "@/components/common/ActionMenu";
import StatusBadge from "@/components/common/StatusBadge";
import { UserStatus } from "@/constants/enums";
import { User } from "@/contracts/types";

interface UsersColumnsProps {
  canManageUsers: boolean;
  /** Password reset is super-admin only — the backend rejects everyone else. */
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

export const getUsersColumns = ({
  canManageUsers,
  canResetPassword,
  onEditClick,
  onDisableClick,
  onEnableClick,
  onResetPasswordClick,
  onDeleteClick,
}: UsersColumnsProps): ColumnDef<User>[] => {
  const columns: ColumnDef<User>[] = [
    {
      header: "Employee ID",
      accessorKey: "employeeId",
      meta: {
        className:
          "hidden lg:table-cell whitespace-nowrap text-xs font-semibold uppercase text-muted-foreground",
        headerClassName: "hidden lg:table-cell",
      },
      cell: ({ row }) => row.original.employeeId || "-",
    },
    {
      header: "Name",
      accessorKey: "fullName",
      meta: {
        className: "min-w-[180px]",
      },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            {[row.original.firstName, row.original.middleName, row.original.lastName].filter(Boolean).join(" ")}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {row.original.designation}
          </span>
        </div>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      meta: {
        className: "hidden md:table-cell min-w-[240px] whitespace-nowrap",
        headerClassName: "hidden md:table-cell",
      },
    },
    {
      header: "Contact",
      accessorKey: "mobile",
      meta: {
        className: "hidden lg:table-cell whitespace-nowrap",
        headerClassName: "hidden lg:table-cell",
      },
      cell: ({ row }) => row.original.mobile || "-",
    },
    {
      header: "Role",
      accessorKey: "role",
      meta: {
        className: "whitespace-nowrap",
      },
      cell: ({ row }) => <StatusBadge status={row.original.role} />,
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

  if (canManageUsers) {
    columns.push({
      id: "actions",
      header: "Action",
      meta: {
        headerClassName: "text-center",
        className: "text-center whitespace-nowrap",
      },
      cell: ({ row }) => {
        const user = row.original;
          const menuItems: ActionMenuItem[] = [
          {
            label: "Edit",
            icon: Edit,
            onClick: () => onEditClick(user),
            tooltip: "Edit this user",
          },
        ];

        if (user.status === UserStatus.ACTIVE) {
          menuItems.push({
            label: "Disable User",
            icon: Ban,
            variant: "destructive",
            onClick: () => onDisableClick(user.id, [user.firstName, user.lastName].filter(Boolean).join(" ")),
            tooltip: "Disable this user",
          });
        } else {
          menuItems.push({
            label: "Enable User",
            icon: CheckCircle2,
            onClick: () => onEnableClick(user.id, [user.firstName, user.lastName].filter(Boolean).join(" ")),
            tooltip: "Enable this user",
          });
        }

        if (canResetPassword) {
          menuItems.push({
            label: "Reset Password",
            icon: KeyRound,
            onClick: () => onResetPasswordClick(user),
            tooltip: "Set a temporary password and sign this user out",
          });
        }

        menuItems.push({
          label: "Delete User",
          icon: Trash2,
          variant: "destructive",
          onClick: () => onDeleteClick(user.id, [user.firstName, user.lastName].filter(Boolean).join(" "), user.status),
          tooltip: "Delete this user",
        });

        return <ActionMenu items={menuItems} />;
      },
    });
  }

  return columns;
};
