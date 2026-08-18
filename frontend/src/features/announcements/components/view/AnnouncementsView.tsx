import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListViewLayout from "@/components/common/layout/ListViewLayout";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useListView } from "@/hooks/useListView";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES, type UserRole } from "@/constants/roles";
import type { AnnouncementListItem } from "@/contracts/types";
import {
  useAnnouncements,
  useArchiveAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
} from "../../hooks/useAnnouncements";
import { getAnnouncementFilterConfig } from "../../constants/filters";
import type { AnnouncementListParams } from "../../types";
import AnnouncementTable from "../table/AnnouncementTable";

type PendingAction = {
  type: "publish" | "archive" | "delete";
  announcement: AnnouncementListItem;
};

const AnnouncementsView = () => {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  /**
   * Role still drives what is RENDERED — the blurb and the organization column —
   * but no longer which URL you are on. Super admin and organization admin share
   * this page, so it lives at one path for both, like /audit-logs.
   */
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const listPath = "/announcements";

  const filterConfig = useMemo(
    () => getAnnouncementFilterConfig(user?.role as UserRole | undefined),
    [user?.role],
  );

  const { queryParams, onPageChange, toolbarProps } = useListView({
    filterConfig,
  });

  const { data, isLoading } = useAnnouncements(
    queryParams as AnnouncementListParams,
  );
  const announcements = data?.data ?? [];
  const meta = data?.meta;

  const publishAnnouncement = usePublishAnnouncement();
  const archiveAnnouncement = useArchiveAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [pending, setPending] = useState<PendingAction | null>(null);

  const handleCreate = useCallback(() => {
    navigate(`${listPath}/create`);
  }, [listPath, navigate]);

  const handleEdit = useCallback(
    (announcement: AnnouncementListItem) => {
      navigate(`${listPath}/${announcement.id}/edit`);
    },
    [listPath, navigate],
  );

  const confirmPending = () => {
    if (!pending) return;

    const { type, announcement } = pending;
    const onSettled = () => setPending(null);

    if (type === "publish") {
      publishAnnouncement.mutate(announcement.id, { onSettled });
    } else if (type === "archive") {
      archiveAnnouncement.mutate(announcement.id, { onSettled });
    } else {
      deleteAnnouncement.mutate(announcement.id, { onSettled });
    }
  };

  const confirmCopy = () => {
    if (!pending) return { title: "", description: "", confirmText: "" };

    const { type, announcement } = pending;

    if (type === "publish") {
      return {
        title: "Publish this announcement?",
        description: announcement.publishAt
          ? `"${announcement.title}" will go live at its scheduled start time. Its audience cannot be changed after publishing.`
          : `"${announcement.title}" becomes visible immediately. Its audience cannot be changed after publishing.`,
        confirmText: "Publish",
      };
    }

    if (type === "archive") {
      return {
        title: "Archive this announcement?",
        description: `"${announcement.title}" will stop appearing for everyone. It cannot be edited or republished afterwards.`,
        confirmText: "Archive",
      };
    }

    return {
      title: "Delete this announcement?",
      description: `"${announcement.title}" will be removed from the console and from everyone's feed.`,
      confirmText: "Delete",
    };
  };

  const copy = confirmCopy();
  const confirmLoading =
    publishAnnouncement.isPending ||
    archiveAnnouncement.isPending ||
    deleteAnnouncement.isPending;

  return (
    <ListViewLayout
      {...toolbarProps}
      title="Announcements"
      description={
        isSuperAdmin
          ? "Broadcast to every organization on the platform"
          : "Broadcast to everyone in your organization"
      }
      filterConfig={filterConfig}
      searchPlaceholder="Search by title or message..."
      addButtonLabel="New Announcement"
      onAddClick={handleCreate}
      table={
        <AnnouncementTable
          announcements={announcements}
          loading={isLoading}
          showOrganization={isSuperAdmin}
          onEdit={handleEdit}
          onPublish={(announcement) =>
            setPending({ type: "publish", announcement })
          }
          onArchive={(announcement) =>
            setPending({ type: "archive", announcement })
          }
          onDelete={(announcement) =>
            setPending({ type: "delete", announcement })
          }
        />
      }
      meta={meta}
      onPageChange={onPageChange}
      itemLabel="announcements"
    >
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={copy.title}
        description={copy.description}
        confirmText={copy.confirmText}
        variant={pending?.type === "delete" ? "destructive" : "default"}
        loading={confirmLoading}
        onConfirm={confirmPending}
      />
    </ListViewLayout>
  );
};

export default AnnouncementsView;
