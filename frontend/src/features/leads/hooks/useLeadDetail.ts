import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { leadsService } from "../api/services";

export const useLeadDetail = (id?: string) => {
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
    queryKey: id
      ? queryKeys.leads.detail(id, selectedOrgId)
      : queryKeys.leads.all,
    queryFn: async () => {
      if (!id) return null;
      return leadsService.getLeadDetails(id);
    },
    enabled: !!id && isEnabled,
  });
};
