import { useMemo } from "react";
import { DataTable } from "@/components/common/table/DataTable";
import { useDataTable } from "@/components/common/table/useDataTable";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import ActionMenu from "@/components/common/ActionMenu";
import { Archive, Pencil, Send, Trash2 } from "lucide-react";
import type { AnnouncementListItem } from "@/contracts/types";
import {
  ANNOUNCEMENT_SEVERITY_LABELS,
  ANNOUNCEMENT_STATUS_BADGE_TYPE,
  ANNOUNCEMENT_STATUS_LABELS,
} from "../../constants/labels";
import { describeSchedule, getAnnouncementColumns } from "./announcement.columns";

interface AnnouncementTableProps {
  announcements: AnnouncementListItem[];
  loading: boolean;
  showOrganization: boolean;
  onEdit: (announcement: AnnouncementListItem) => void;
  onPublish: (announcement: AnnouncementListItem) => void;
  onArchive: (announcement: AnnouncementListItem) => void;
  onDelete: (announcement: AnnouncementListItem) => void;
}

const AnnouncementTable = ({
  announcements,
  loading,
  showOrganization,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
}: AnnouncementTableProps) => {
  // Target organization names arrive resolved on each row. They used to be
  // mapped here from the first page of useOrganizations, which capped at 100
  // and blanked every target past it.
  const columns = useMemo(
    () =>
      getAnnouncementColumns({
        showOrganization,
        onEdit,
        onPublish,
        onArchive,
        onDelete,
      }),
    [showOrganization, onEdit, onPublish, onArchive, onDelete],
  );

  // Pagination is server-side (see useListView), so the table renders one page.
  const table = useDataTable({
    data: announcements,
    columns,
    pageCount: -1,
    pagination: { pageIndex: 0, pageSize: announcements.length || 10 },
    onPaginationChange: () => {},
  });

  return (
    <DataTable
      table={table}
      isLoading={loading}
      loadingMessage="Loading announcements..."
      mobileCardRenderer={(announcement) => (
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {announcement.title}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {announcement.body}
              </p>
            </div>
            <StatusBadge
              status={announcement.status}
              label={ANNOUNCEMENT_STATUS_LABELS[announcement.status]}
              type={ANNOUNCEMENT_STATUS_BADGE_TYPE[announcement.status]}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-muted-foreground">Severity</p>
              <p className="font-bold text-foreground">
                {ANNOUNCEMENT_SEVERITY_LABELS[announcement.severity]}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-muted-foreground">Schedule</p>
              <p className="font-bold text-foreground">
                {describeSchedule(announcement)}
              </p>
            </div>
            {showOrganization && (
              <div className="col-span-2 rounded-lg bg-muted/40 p-2">
                <p className="text-muted-foreground">Organization</p>
                <p className="truncate font-bold text-foreground">
                  {announcement.organizationName ?? "Platform"}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end border-t border-border/60 pt-3">
            <ActionMenu
              items={[
                {
                  label: "Edit",
                  icon: Pencil,
                  onClick: () => onEdit(announcement),
                  disabled: announcement.status === "ARCHIVED",
                },
                {
                  label: "Publish",
                  icon: Send,
                  onClick: () => onPublish(announcement),
                  disabled:
                    announcement.status === "PUBLISHED" ||
                    announcement.status === "SCHEDULED" ||
                    announcement.status === "ARCHIVED",
                },
                {
                  label: "Archive",
                  icon: Archive,
                  onClick: () => onArchive(announcement),
                  disabled: announcement.status === "ARCHIVED",
                },
                {
                  label: "Delete",
                  icon: Trash2,
                  onClick: () => onDelete(announcement),
                  variant: "destructive",
                },
              ]}
            />
          </div>
        </article>
      )}
      emptyState={
        <EmptyState
          title="No announcements yet"
          description="Create one to broadcast a message to your people."
          className="border-none"
        />
      }
    />
  );
};

export default AnnouncementTable;
