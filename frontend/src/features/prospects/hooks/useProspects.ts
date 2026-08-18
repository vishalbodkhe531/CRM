import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { prospectsService } from "../api/prospectsService";
import type { ProspectFilterValues } from "../types";

export const useProspects = (params?: ProspectFilterValues) => {
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
    queryKey: queryKeys.prospects.list(params, selectedOrgId),
    queryFn: () => prospectsService.getProspects(params),
    enabled: isEnabled,
  });
};

export const useProspectDetail = (id?: string) => {
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
    queryKey: queryKeys.prospects.detail(id || "", selectedOrgId),
    queryFn: () => (id ? prospectsService.getProspectDetails(id) : null),
    enabled: !!id && isEnabled,
  });
};

