import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { leadsService } from "../api/services";
import type { LeadFilterValues } from "../types";
import { useAppSelector } from "@/hooks/useRedux";

interface UseAssignableUsersOptions {
  enabled?: boolean;
}

export const useLeads = (params?: LeadFilterValues) => {
  const selectedOrgId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user
    ? user.role === "SUPER_ADMIN"
      ? !!selectedOrgId
      : true
    : false;

  return useQuery({
    queryKey: queryKeys.leads.list(params, selectedOrgId),
    queryFn: () => leadsService.getLeads(params),
    placeholderData: keepPreviousData,
    enabled: isEnabled,
  });
};

export const useAssignableUsers = (options?: UseAssignableUsersOptions) => {
  const selectedOrgId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user
    ? user.role === "SUPER_ADMIN"
      ? !!selectedOrgId
      : true
    : false;

  return useQuery({
    queryKey: queryKeys.leads.assignableUsers(selectedOrgId),
    queryFn: async () => {
      return await leadsService.getAssignableUsers();
    },
    enabled: isEnabled && (options?.enabled ?? true),
  });
};
