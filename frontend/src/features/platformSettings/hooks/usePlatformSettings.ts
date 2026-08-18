import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import {
  platformSettingsService,
  type PlatformSettingsPayload,
} from "../api/services";

/**
 * Platform settings.
 *
 * `usePlatformSettings` and `useUpdatePlatformSettings` are super-admin only —
 * the backend enforces that with PLATFORM_MANAGE, and the `enabled` guard just
 * stops an admin's browser firing a request it can only get a 403 from.
 *
 * `usePublicPlatformSettings` is for every signed-in user: the sidebar shows the
 * product name and the Help page shows support contacts.
 */

export const usePlatformSettings = () => {
  const isSuperAdmin =
    useAppSelector((s) => s.auth.user?.role) === ROLES.SUPER_ADMIN;

  return useQuery({
    queryKey: queryKeys.platformSettings.settings,
    queryFn: () => platformSettingsService.getSettings(),
    enabled: isSuperAdmin,
    staleTime: 60_000,
  });
};

export const usePublicPlatformSettings = () => {
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.user));

  return useQuery({
    queryKey: queryKeys.platformSettings.public,
    queryFn: () => platformSettingsService.getPublicSettings(),
    enabled: isAuthenticated,
    // Changes about once a year. Refetching it on every mount would be noise.
    staleTime: 10 * 60_000,
  });
};

export const useUpdatePlatformSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PlatformSettingsPayload) =>
      platformSettingsService.updateSettings(payload),
    onSuccess: () => {
      toast.success("Platform settings saved.");
      // Both the full and public reads change together, and the public one
      // feeds the sidebar and Help page on every screen.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platformSettings.all,
      });
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};
