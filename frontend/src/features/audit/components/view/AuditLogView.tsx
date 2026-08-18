import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import { Button } from "@/components/ui/button";
import { useListView } from "@/hooks/useListView";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES, type UserRole } from "@/constants/roles";
import type { AuditLogEntry } from "@/contracts/types";
import { useOrganizations } from "@/features/organizations";
import { useAuditLogs, useExportAuditLogs } from "../../hooks/useAuditLogs";
import { getAuditFilterConfig } from "../../constants/filters";
import type { AuditLogListParams } from "../../types";
import AuditTable from "../table/AuditTable";
import AuditDiffDialog from "../details/AuditDiffDialog";

const AuditLogView = () => {
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  // Only a super-admin can filter by organization, so only they pay for the list.
  const { data: organizationsData } = useOrganizations(
    { limit: 100 },
    { enabled: isSuperAdmin },
  );

  const organizationOptions = useMemo(
    () =>
      (organizationsData?.data ?? []).map((organization) => ({
        label: organization.name,
        value: organization.id,
      })),
    [organizationsData],
  );

  const filterConfig = useMemo(
    () =>
      getAuditFilterConfig(
        user?.role as UserRole | undefined,
        organizationOptions,
      ),
    [user?.role, organizationOptions],
  );

  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig,
  });

  const { data, isLoading } = useAuditLogs(queryParams as AuditLogListParams);
  const exportAuditLogs = useExportAuditLogs();
  const entries = data?.data ?? [];
  const meta = data?.meta;

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewDetail = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  };

  return (
    <ListViewLayout
      {...toolbarProps}
      title="Audit Log"
      description={
        isSuperAdmin
          ? "Track activity across every organization on the platform"
          : "Track activity across your organization"
      }
      filterConfig={filterConfig}
      searchPlaceholder="Search by actor email or action..."
      showAddButton={false}
      extraActions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={exportAuditLogs.isPending}
          // The current filters, not the current page — an export is how you
          // get the whole matching set out.
          onClick={() =>
            exportAuditLogs.mutate(queryParams as AuditLogListParams)
          }
        >
          <Download className="h-4 w-4" />
          {exportAuditLogs.isPending ? "Exporting..." : "Export CSV"}
        </Button>
      }
      table={
        <AuditTable
          entries={entries}
          loading={isLoading}
          showOrganization={isSuperAdmin}
          onViewDetail={handleViewDetail}
        />
      }
      meta={meta}
      onPageChange={onPageChange}
      itemLabel="entries"
    >
      <AuditDiffDialog
        entry={selectedEntry}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </ListViewLayout>
  );
};

export default AuditLogView;
