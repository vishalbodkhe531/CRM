import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListView } from "@/hooks/useListView";
import OrganizationsTable from "../table/OrganizationsTable";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useOrganizations } from "../../hooks/useOrganizations";
import {
  useArchiveOrganization,
  useRestoreOrganization,
  useUpdateOrganizationStatus,
} from "../../hooks/useOrganizationMutations";
import type { Organization, OrganizationStatus, OrganizationListParams } from "../../types";
import { ORGANIZATION_FILTER_CONFIG } from "../../constants/filters";

const OrganizationsView = () => {
  const navigate = useNavigate();
  
  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig: ORGANIZATION_FILTER_CONFIG,
  });

  const { data, isLoading } = useOrganizations(queryParams as OrganizationListParams);
  const organizations = data?.data || [];
  const meta = data?.meta;

  const { mutateAsync: updateStatusMutation, isPending: isUpdating } =
    useUpdateOrganizationStatus();
  const { mutateAsync: archiveMutation, isPending: isArchiving } =
    useArchiveOrganization();
  const { mutateAsync: restoreMutation, isPending: isRestoring } =
    useRestoreOrganization();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [pendingStatus, setPendingStatus] = useState<OrganizationStatus | null>(null);

  const [archiveOrg, setArchiveOrg] = useState<Organization | null>(null);
  const [restoreOrg, setRestoreOrg] = useState<Organization | null>(null);

  const actionLoading = isUpdating || isArchiving || isRestoring;

  const handleStatusClick = (organization: Organization, status: OrganizationStatus) => {
    setSelectedOrg(organization);
    setPendingStatus(status);
    setConfirmOpen(true);
  };

  const handleConfirmStatus = async () => {
    if (!selectedOrg || !pendingStatus) return;

    try {
      await updateStatusMutation({ id: selectedOrg.id, status: pendingStatus });
      setConfirmOpen(false);
      setSelectedOrg(null);
      setPendingStatus(null);
    } catch {
      // Error handled in hook.
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveOrg) return;
    try {
      await archiveMutation(archiveOrg.id);
      setArchiveOrg(null);
    } catch {
      // Error handled in hook.
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreOrg) return;
    try {
      await restoreMutation(restoreOrg.id);
      setRestoreOrg(null);
    } catch {
      // Error handled in hook.
    }
  };

  return (
    <ListViewLayout
      {...toolbarProps}
      title="Organizations"
      description="Manage customer organizations on the platform"
      filterConfig={ORGANIZATION_FILTER_CONFIG}
      searchPlaceholder="Search Organizations by name..."
      addButtonLabel="+ Add Organization"
      onAddClick={() => navigate("/platform/organizations/add")}
      table={
        <OrganizationsTable
          organizations={organizations}
          loading={isLoading}
          actionLoading={actionLoading}
          onUpdateStatus={handleStatusClick}
          onArchive={setArchiveOrg}
          onRestore={setRestoreOrg}
        />
      }
      meta={meta}
      onPageChange={onPageChange}
      itemLabel="organizations"
    >
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pendingStatus === "ACTIVE" ? "Activate Organization" : "Suspend Organization"}
        description={
          pendingStatus === "ACTIVE"
            ? `Are you sure you want to reactivate "${selectedOrg?.name}"? Users will regain access immediately.`
            : `Are you sure you want to suspend "${selectedOrg?.name}"? All users will lose access immediately.`
        }
        confirmText={pendingStatus === "ACTIVE" ? "Activate" : "Suspend"}
        onConfirm={handleConfirmStatus}
        loading={isUpdating}
        variant={pendingStatus === "ACTIVE" ? "default" : "destructive"}
      />

      <ConfirmDialog
        open={Boolean(archiveOrg)}
        onOpenChange={(open) => !open && setArchiveOrg(null)}
        title="Archive Organization"
        description={`This will lock out every user in "${archiveOrg?.name}" immediately and hide the organization from the list. No data is deleted, and the slug and prefix stay reserved. You can restore it later.`}
        confirmText="Archive"
        confirmPhrase={archiveOrg?.name}
        confirmPhraseLabel={`Type the organization name to confirm`}
        onConfirm={handleConfirmArchive}
        loading={isArchiving}
        variant="destructive"
      />

      <ConfirmDialog
        open={Boolean(restoreOrg)}
        onOpenChange={(open) => !open && setRestoreOrg(null)}
        title="Restore Organization"
        description={`This will reactivate "${restoreOrg?.name}" and restore access for its users.`}
        confirmText="Restore"
        onConfirm={handleConfirmRestore}
        loading={isRestoring}
      />
    </ListViewLayout>
  );
};

export default OrganizationsView;
