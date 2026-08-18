import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { customersService } from "../api/customersService";
import type { ProspectFilterValues } from "@/features/prospects/types";

export const useCustomers = (params?: ProspectFilterValues) => {
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
    queryFn: () => customersService.getCustomers(params),
    enabled: isEnabled,
  });
};

export const useCustomerStats = () => {
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
    queryKey: queryKeys.prospects.customerStats(selectedOrgId),
    queryFn: () => customersService.getCustomerStats(),
    enabled: isEnabled,
  });
};
