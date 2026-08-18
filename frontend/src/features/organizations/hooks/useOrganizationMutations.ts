import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import { organizationsService } from "../api/services";
import type { OrganizationStatus } from "@/contracts/types";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "@/contracts/validation";

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationInput | FormData) => 
      organizationsService.createOrganization(data),
    onSuccess: () => {
      toast.success("Organization created successfully");
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.listScope,
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateOrganizationInput | FormData;
    }) => organizationsService.updateOrganization(id, data),
    onSuccess: (data) => {
      toast.success("Organization updated successfully");
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.listScope,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.bySlug(data.slug),
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};

export const useArchiveOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationsService.archiveOrganization(id),
    onSuccess: (data) => {
      toast.success(`"${data.name}" archived. All its users are locked out.`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.listScope,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.bySlug(data.slug),
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};

export const useRestoreOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationsService.restoreOrganization(id),
    onSuccess: (data) => {
      toast.success(`"${data.name}" restored and reactivated`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.listScope,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.bySlug(data.slug),
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};

export const useUpdateOrganizationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: OrganizationStatus;
    }) => organizationsService.updateOrganizationStatus(id, status),
    onSuccess: (data) => {
      toast.success(
        `Organization ${data.status === "ACTIVE" ? "activated" : "suspended"} successfully`,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.listScope,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.bySlug(data.slug),
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};
