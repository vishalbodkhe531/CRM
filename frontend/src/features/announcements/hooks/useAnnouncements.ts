import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import { announcementService } from "../api/services";
import type { AnnouncementListParams, AnnouncementPayload } from "../types";

/**
 * Management list.
 *
 * Super-admin reads across tenants; an org admin is pinned to its own
 * organization-scoped rows by the backend. The selected org id is part of the key
 * so a super-admin browsing an organization workspace does not reuse the
 * unscoped cache entry.
 */
export const useAnnouncements = (params?: AnnouncementListParams) => {
  const user = useAppSelector((s) => s.auth.user);
  const selectedOrgId = useAppSelector((s) => s.auth.selectedOrganizationId);

  const canManage =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  return useQuery({
    queryKey: queryKeys.announcements.list(params, selectedOrgId),
    queryFn: () => announcementService.getAnnouncements(params),
    placeholderData: keepPreviousData,
    enabled: canManage,
  });
};

export const useAnnouncement = (id?: string) => {
  const user = useAppSelector((s) => s.auth.user);
  const selectedOrgId = useAppSelector((s) => s.auth.selectedOrganizationId);

  const canManage =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  return useQuery({
    queryKey: id
      ? queryKeys.announcements.detail(id, selectedOrgId)
      : queryKeys.announcements.detailScope,
    queryFn: () => announcementService.getAnnouncement(id!),
    enabled: canManage && Boolean(id),
  });
};

/**
 * Mutations invalidate BOTH the management list and every feed: publishing is
 * precisely the moment a row starts appearing in other people's bells, and the
 * author's own bell should reflect that without a reload.
 */
const useAnnouncementInvalidation = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.announcements.listScope,
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.announcements.feedScope,
    });
  };
};

export const useCreateAnnouncement = () => {
  const invalidate = useAnnouncementInvalidation();

  return useMutation({
    mutationFn: (payload: AnnouncementPayload) =>
      announcementService.createAnnouncement(payload),
    onSuccess: () => {
      toast.success("Announcement saved as a draft");
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};

export const useUpdateAnnouncement = () => {
  const invalidate = useAnnouncementInvalidation();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<AnnouncementPayload>;
    }) => announcementService.updateAnnouncement(id, payload),
    onSuccess: () => {
      toast.success("Announcement updated");
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};

export const usePublishAnnouncement = () => {
  const invalidate = useAnnouncementInvalidation();

  return useMutation({
    mutationFn: (id: string) => announcementService.publishAnnouncement(id),
    onSuccess: (response) => {
      const announcement = response.data;
      toast.success(
        announcement?.isLive
          ? "Announcement is now live"
          : "Announcement published — it goes live at its scheduled time",
      );
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};

export const useArchiveAnnouncement = () => {
  const invalidate = useAnnouncementInvalidation();

  return useMutation({
    mutationFn: (id: string) => announcementService.archiveAnnouncement(id),
    onSuccess: () => {
      toast.success("Announcement archived");
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};

export const useDeleteAnnouncement = () => {
  const invalidate = useAnnouncementInvalidation();

  return useMutation({
    mutationFn: (id: string) => announcementService.deleteAnnouncement(id),
    onSuccess: () => {
      toast.success("Announcement deleted");
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};
