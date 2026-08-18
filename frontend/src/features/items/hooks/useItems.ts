import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { itemsService } from "../api/services";
import type { ItemListParams } from "../types";
import { useAppSelector } from "@/hooks/useRedux";

interface UseItemsOptions {
  enabled?: boolean;
}

export const useItems = (params?: ItemListParams, options?: UseItemsOptions) => {
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user
    ? user.role === "SUPER_ADMIN"
      ? !!selectedOrgId
      : true
    : false;

  return useQuery({
    queryKey: queryKeys.items.list(params, selectedOrgId),
    queryFn: async () => {
      const data = await itemsService.getItems(params);
      return {
        data: data.data,
        meta: data.meta,
      };
    },
    placeholderData: keepPreviousData,
    enabled: isEnabled && (options?.enabled ?? true),
  });
};

export const useItemStats = () => {
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user
    ? user.role === "SUPER_ADMIN"
      ? !!selectedOrgId
      : true
    : false;

  return useQuery({
    queryKey: queryKeys.items.stats(selectedOrgId),
    queryFn: itemsService.getItemStats,
    enabled: isEnabled,
  });
};

export const useItemDetail = (id: string | undefined) => {
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user
    ? user.role === "SUPER_ADMIN"
      ? !!selectedOrgId
      : true
    : false;

  return useQuery({
    queryKey: id ? queryKeys.items.detail(id, selectedOrgId) : queryKeys.items.all,
    queryFn: async () => {
      if (!id) return null;
      return await itemsService.getItemDetail(id);
    },
    enabled: !!id && isEnabled,
  });
};
