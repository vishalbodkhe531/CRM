import { useCallback, useMemo } from "react";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import type { Organization } from "../../types";
import type { OrganizationStatus } from "@/contracts/types";
import { getOrganizationsColumns } from "./organizations.columns";

interface OrganizationsTableProps {
  organizations: Organization[];
  loading: boolean;
  actionLoading: boolean;
  onUpdateStatus: (org: Organization, status: OrganizationStatus) => void;
  onArchive: (org: Organization) => void;
  onRestore: (org: Organization) => void;
}

const OrganizationsTable = ({
  organizations,
  loading,
  actionLoading,
  onUpdateStatus,
  onArchive,
  onRestore,
}: OrganizationsTableProps) => {
  const navigate = useNavigate();
  const handleEdit = useCallback((organization: Organization) => {
    navigate(`/platform/organizations/${organization.slug}/edit`);
  }, [navigate]);

  const columns = useMemo(
    () =>
      getOrganizationsColumns({
        actionLoading,
        onEdit: handleEdit,
        onUpdateStatus,
        onArchive,
        onRestore,
      }),
    [actionLoading, handleEdit, onUpdateStatus, onArchive, onRestore]
  );

  const table = useDataTable({
    data: organizations,
    columns,
    pageCount: -1,
    pagination: { pageIndex: 0, pageSize: organizations.length || 10 },
    onPaginationChange: () => {},
  });

  return (
    <DataTable 
      table={table} 
      isLoading={loading}
      loadingMessage="Loading organizations..."
      mobileCardRenderer={(organization) => {
        const nextStatus =
          organization.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
        return (
          <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={`/platform/organizations/${organization.slug}/users`}
                  className="truncate text-sm font-bold text-foreground hover:text-primary"
                >
                  {organization.name}
                </Link>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {organization.slug}
                </p>
              </div>
              <StatusBadge
                status={
                  organization.isArchived ? "ARCHIVED" : organization.status
                }
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="font-bold text-foreground">
                  {organization._count?.users ?? 0}
                </p>
                <p className="text-muted-foreground">Users</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="font-bold text-foreground">
                  {organization._count?.leads ?? 0}
                </p>
                <p className="text-muted-foreground">Leads</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="font-bold text-foreground">
                  {organization._count?.items ?? 0}
                </p>
                <p className="text-muted-foreground">Items</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
              {organization.isArchived ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => onRestore(organization)}
                >
                  Restore
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(organization)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      organization.status === "ACTIVE"
                        ? "destructive"
                        : "outline"
                    }
                    disabled={actionLoading}
                    onClick={() => onUpdateStatus(organization, nextStatus)}
                  >
                    {organization.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actionLoading}
                    onClick={() => onArchive(organization)}
                  >
                    Archive
                  </Button>
                </>
              )}
            </div>
          </article>
        );
      }}
      emptyState={
        <EmptyState
          title="No organizations found"
          description="Create one to get started."
          className="border-none"
        />
      }
    />
  );
};

export default OrganizationsTable;
