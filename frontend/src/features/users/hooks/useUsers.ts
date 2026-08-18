import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { usersService } from "../api/services";
import type { UserListParams } from "../types";
import { useAppSelector } from "@/hooks/useRedux";

interface UseUsersOptions {
  enabled?: boolean;
}

export const useUsers = (
  params?: UserListParams,
  options?: UseUsersOptions,
) => {
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
    queryKey: queryKeys.users.list(params, selectedOrgId),
    queryFn: () => usersService.getUsers(params),
    placeholderData: keepPreviousData,
    enabled: isEnabled && (options?.enabled ?? true),
  });
};



export const useUserDetail = (id: string | undefined) => {
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
    queryKey: id ? queryKeys.users.detail(id, selectedOrgId) : queryKeys.users.all,
    queryFn: async () => {
      if (!id) return null;
      return usersService.getUserDetail(id);
    },
    enabled: !!id && isEnabled,
  });
};
