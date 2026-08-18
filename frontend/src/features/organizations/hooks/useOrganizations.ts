import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { organizationsService } from "../api/services";
import type { OrganizationListParams } from "../types";

interface UseOrganizationsOptions {
  enabled?: boolean;
}

export const useOrganizations = (
  params?: OrganizationListParams,
  options?: UseOrganizationsOptions,
) => {
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return useQuery({
    queryKey: queryKeys.organizations.list(params),
    queryFn: () => organizationsService.getOrganizations(params),
    placeholderData: keepPreviousData,
    enabled: isSuperAdmin && (options?.enabled ?? true),
  });
};

export const useOrganizationDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: id
      ? queryKeys.organizations.detail(id)
      : queryKeys.organizations.all,
    queryFn: async () => {
      if (!id) return null;
      return organizationsService.getOrganizationDetail(id);
    },
    enabled: !!id,
  });
};

export const useOrganizationBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: slug
      ? queryKeys.organizations.bySlug(slug)
      : queryKeys.organizations.all,
    queryFn: async () => {
      if (!slug) return null;
      return organizationsService.getOrganizationBySlug(slug);
    },
    enabled: !!slug,
  });
};
