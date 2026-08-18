import { useQuery } from "@tanstack/react-query";
import { ROLES, type UserRole } from "@/constants/roles";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_ENDPOINTS } from "../api/endpoints";
import { dashboardService } from "../api/services";
import { useAppSelector } from "@/hooks/useRedux";
import type { DashboardStats } from "../types";

const dashboardEndpointsByRole: Record<UserRole, string> = {
  [ROLES.SUPER_ADMIN]: DASHBOARD_ENDPOINTS.SUPER_ADMIN,
  [ROLES.ADMIN]: DASHBOARD_ENDPOINTS.ADMIN,
  [ROLES.MANAGER]: DASHBOARD_ENDPOINTS.MANAGER,
  [ROLES.EXECUTIVE]: DASHBOARD_ENDPOINTS.EXECUTIVE,
};

export const useDashboardStats = (role?: UserRole) => {
  const endpoint = role ? dashboardEndpointsByRole[role] : undefined;
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);

  return useQuery<DashboardStats | null>({
    queryKey: role
      ? queryKeys.dashboard.detail(role, selectedOrgId)
      : queryKeys.dashboard.all(selectedOrgId),
    queryFn: async () => {
      if (!endpoint) return null;
      return await dashboardService.getStats(endpoint);
    },
    enabled: !!endpoint,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
