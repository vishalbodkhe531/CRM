import { type ColumnDef } from "@tanstack/react-table";
import { Archive, Pencil, Send, Trash2 } from "lucide-react";
import ActionMenu from "@/components/common/ActionMenu";
import StatusBadge from "@/components/common/StatusBadge";
import type { AnnouncementListItem } from "@/contracts/types";
import {
  ANNOUNCEMENT_SCOPE_LABELS,
  ANNOUNCEMENT_SEVERITY_BADGE_TYPE,
  ANNOUNCEMENT_SEVERITY_LABELS,
  ANNOUNCEMENT_STATUS_BADGE_TYPE,
  ANNOUNCEMENT_STATUS_LABELS,
} from "../../constants/labels";

interface AnnouncementColumnsProps {
  showOrganization: boolean;
  onEdit: (announcement: AnnouncementListItem) => void;
  onPublish: (announcement: AnnouncementListItem) => void;
  onArchive: (announcement: AnnouncementListItem) => void;
  onDelete: (announcement: AnnouncementListItem) => void;
}

/**
 * The stored status and the live status are different questions: a PUBLISHED row
 * with a future publishAt is not yet visible to anyone. `isLive` comes from the
 * backend so the timing rules stay in one place.
 */
export const describeSchedule = (announcement: AnnouncementListItem): string => {
  // SCHEDULED is a future-dated publish; it shares PUBLISHED's timing display.
  if (
    announcement.status !== "PUBLISHED" &&
    announcement.status !== "SCHEDULED"
  ) {
    return "—";
  }

  const now = Date.now();

  if (announcement.publishAt && new Date(announcement.publishAt).getTime() > now) {
    return `Starts ${new Date(announcement.publishAt).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  if (announcement.expiresAt) {
    const expiry = new Date(announcement.expiresAt);
    const label = expiry.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    return expiry.getTime() <= now ? `Ended ${label}` : `Until ${label}`;
  }

  return "Live";
};

export const getAnnouncementColumns = ({
  showOrganization,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
}: AnnouncementColumnsProps): ColumnDef<AnnouncementListItem>[] => {
  const columns: ColumnDef<AnnouncementListItem>[] = [
    {
      header: "Title",
      accessorKey: "title",
      cell: ({ row }) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.body}
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const { status, isLive } = row.original;
        return (
          <div className="space-y-1">
            <StatusBadge
              status={status}
              label={ANNOUNCEMENT_STATUS_LABELS[status]}
              type={ANNOUNCEMENT_STATUS_BADGE_TYPE[status]}
            />
            {status === "PUBLISHED" && !isLive && (
              <p className="text-[11px] text-muted-foreground">Not yet live</p>
            )}
          </div>
        );
      },
    },
    {
      header: "Severity",
      accessorKey: "severity",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.severity}
          label={ANNOUNCEMENT_SEVERITY_LABELS[row.original.severity]}
          type={ANNOUNCEMENT_SEVERITY_BADGE_TYPE[row.original.severity]}
        />
      ),
    },
    {
      header: "Schedule",
      id: "schedule",
      meta: { className: "text-muted-foreground whitespace-nowrap" },
      cell: ({ row }) => describeSchedule(row.original),
    },
    {
      header: "Audience",
      id: "audience",
      meta: { className: "text-muted-foreground" },
      cell: ({ row }) => {
        const {
          scope,
          targetOrganizationIds,
          targetOrganizationNames,
          targetRoles,
        } = row.original;

        let orgPart: string;
        if (scope !== "PLATFORM") {
          orgPart = ANNOUNCEMENT_SCOPE_LABELS[scope];
        } else if (targetOrganizationIds.length === 0) {
          orgPart = "All organizations";
        } else if (targetOrganizationNames?.length) {
          // Names come resolved from the management list endpoint, so targets
          // beyond the first page of organizations render correctly.
          orgPart =
            targetOrganizationNames.length <= 2
              ? targetOrganizationNames.join(", ")
              : `${targetOrganizationNames.slice(0, 2).join(", ")} +${targetOrganizationNames.length - 2} more`;
        } else {
          orgPart = `${targetOrganizationIds.length} org${targetOrganizationIds.length > 1 ? "s" : ""}`;
        }

        const rolePart = targetRoles.length
          ? `${targetRoles.length} role${targetRoles.length > 1 ? "s" : ""}`
          : "All roles";

        return (
          <div className="text-xs">
            <p className="text-foreground">{orgPart}</p>
            <p className="text-muted-foreground">{rolePart}</p>
          </div>
        );
      },
    },
  ];

  // Only meaningful for super-admin: an org admin's rows are all their own org.
  if (showOrganization) {
    columns.push({
      header: "Organization",
      id: "organization",
      meta: { className: "text-muted-foreground" },
      cell: ({ row }) => row.original.organizationName ?? "Platform",
    });
  }

  columns.push({
    id: "actions",
    header: "Actions",
    meta: {
      headerClassName: "text-right",
      className: "text-right",
    },
    cell: ({ row }) => {
      const announcement = row.original;
      const isArchived = announcement.status === "ARCHIVED";
      // SCHEDULED is already published (future-dated), so it cannot be published
      // again — treat it like PUBLISHED for the action's disabled state.
      const isPublished =
        announcement.status === "PUBLISHED" ||
        announcement.status === "SCHEDULED";

      return (
        <ActionMenu
          items={[
            {
              label: "Edit",
              icon: Pencil,
              onClick: () => onEdit(announcement),
              disabled: isArchived,
              tooltip: isArchived
                ? "Archived announcements cannot be edited"
                : "Edit this announcement",
            },
            {
              label: "Publish",
              icon: Send,
              onClick: () => onPublish(announcement),
              disabled: isPublished || isArchived,
              tooltip: isPublished
                ? "Already published"
                : "Make this announcement live",
            },
            {
              label: "Archive",
              icon: Archive,
              onClick: () => onArchive(announcement),
              disabled: isArchived,
              tooltip: "Take this out of circulation",
            },
            {
              label: "Delete",
              icon: Trash2,
              onClick: () => onDelete(announcement),
              variant: "destructive",
              tooltip: "Delete this announcement",
            },
          ]}
        />
      );
    },
  });

  return columns;
};
