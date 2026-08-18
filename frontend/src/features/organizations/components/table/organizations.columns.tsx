import { type ColumnDef } from "@tanstack/react-table";
import { Archive, ArchiveRestore, Pencil, Plus, Power } from "lucide-react";
import { Link } from "react-router-dom";
import ActionMenu from "@/components/common/ActionMenu";
import StatusBadge from "@/components/common/StatusBadge";
import type { Organization } from "../../types";
import type { OrganizationStatus } from "@/contracts/types";

interface OrganizationsColumnsProps {
  actionLoading: boolean;
  onEdit: (org: Organization) => void;
  onUpdateStatus: (org: Organization, status: OrganizationStatus) => void;
  onArchive: (org: Organization) => void;
  onRestore: (org: Organization) => void;
}

export const getOrganizationsColumns = ({
  actionLoading,
  onEdit,
  onUpdateStatus,
  onArchive,
  onRestore,
}: OrganizationsColumnsProps): ColumnDef<Organization>[] => [
  {
    header: "Name",
    accessorKey: "name",
    meta: {
      className: "font-medium",
    },
    cell: ({ row }) => {
      const org = row.original;
      return (
        <Link
          to={`/platform/organizations/${org.slug}/users`}
          // className="text-primary hover:underline transition-all duration-200"
          className="text-blue-500 underline bg-transparent py-0.5 text-left font-semibold transition-all hover:border-foreground cursor-pointer"
        >
          {org.name}
        </Link>
      );
    },
  },
  {
    header: "Slug",
    accessorKey: "slug",
    meta: {
      className: "text-muted-foreground",
    },
  },
  {
    header: "Prefix",
    accessorKey: "prefix",
  },
  {
    header: "Status",
    accessorKey: "status",
    // An archived org is always SUSPENDED too, so show the archive state
    // instead — it is the more specific and more actionable fact.
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.isArchived ? "ARCHIVED" : row.original.status}
      />
    ),
  },
  {
    id: "users_count",
    header: "Users",
    cell: ({ row }) => row.original._count?.users ?? 0,
  },
  {
    id: "leads_count",
    header: "Leads",
    cell: ({ row }) => row.original._count?.leads ?? 0,
  },
  {
    id: "items_count",
    header: "Items",
    cell: ({ row }) => row.original._count?.items ?? 0,
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    meta: {
      className: "text-muted-foreground",
    },
    cell: ({ row }) => {
      const createdAt = row.original.createdAt;
      return createdAt ? new Date(createdAt).toLocaleDateString("en-IN") : "-";
    },
  },
  {
    id: "actions",
    header: "Actions",
    meta: {
      headerClassName: "text-right",
      className: "text-right",
    },
    cell: ({ row }) => {
      const org = row.original;
      const isArchived = org.isArchived;

      return (
        <ActionMenu
          items={[
            {
              label: "Edit",
              icon: Pencil,
              onClick: () => onEdit(org),
              // Editing an archived org would be editing something that is
              // meant to be inert — restore it first.
              show: !isArchived,
              tooltip: "Edit organization details",
            },
            {
              label: org.status === "ACTIVE" ? "Suspend" : "Activate",
              icon: org.status === "ACTIVE" ? Power : Plus,
              variant: org.status === "ACTIVE" ? "destructive" : "default",
              onClick: () =>
                onUpdateStatus(
                  org,
                  org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                ),
              disabled: actionLoading,
              show: !isArchived,
              tooltip:
                org.status === "ACTIVE"
                  ? "Suspend this organization"
                  : "Activate this organization",
            },
            {
              label: "Archive",
              icon: Archive,
              variant: "destructive",
              onClick: () => onArchive(org),
              disabled: actionLoading,
              show: !isArchived,
              tooltip: "Archive this organization and lock out all its users",
            },
            {
              label: "Restore",
              icon: ArchiveRestore,
              onClick: () => onRestore(org),
              disabled: actionLoading,
              show: isArchived,
              tooltip: "Restore this organization and reactivate it",
            },
          ]}
        />
      );
    },
  },
];
