import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { leadsService } from "../api/services";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import type {
  CreateLeadInput,
  UpdateLeadInput,
} from "@/contracts/validation";
import type { LeadStatus } from "@/contracts/types";

interface LeadListCache {
  data?: Array<{ id: string }>;
}

interface LeadImportResult {
  count?: number;
  successCount?: number;
  failed?: { rowNumber: number; reason: string }[];
}

export const useCreateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeadInput | FormData) => leadsService.createLead(data),
    onSuccess: () => {
      toast.success("Lead created successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.listScope });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  const selectedOrgId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadInput | FormData }) => 
      leadsService.updateLead(id, data),
    onSuccess: (_, variables) => {
      toast.success("Lead updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.listScope });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(variables.id, selectedOrgId),
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();
  const selectedOrgId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );

  return useMutation({
    mutationFn: (id: string) => leadsService.deleteLead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.listScope });
      const previousLeads = queryClient.getQueryData(queryKeys.leads.listScope);

      // Optimistically remove lead from all cached lists
      queryClient.setQueriesData({ queryKey: queryKeys.leads.listScope }, (old: LeadListCache | undefined) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.filter((lead) => lead.id !== id),
        };
      });

      return { previousLeads };
    },
    onSuccess: (_, id) => {
      toast.success("Lead deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.listScope });
      queryClient.removeQueries({
        queryKey: queryKeys.leads.detail(id, selectedOrgId),
      });
    },
    onError: (error, _id, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads.listScope, context.previousLeads);
      }
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.listScope });
    },
  });
};

export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();
  const selectedOrgId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: LeadStatus;
    }) => leadsService.updateLeadStatus(id, status),
    onSuccess: (result, variables) => {
      toast.success(
        result?.meta?.prospect
          ? "Lead qualified and converted to prospect"
          : "Lead status updated"
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.listScope });
      queryClient.invalidateQueries({ queryKey: queryKeys.prospects.listScope });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(variables.id, selectedOrgId),
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};

export const useAssignLead = () => {
  const queryClient = useQueryClient();
  const selectedOrgId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );

  return useMutation({
    mutationFn: ({
      id,
      executiveId,
    }: {
      id: string;
      executiveId: string;
    }) => leadsService.assignLead(id, executiveId),
    onSuccess: (_, variables) => {
      toast.success("Lead assigned successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.listScope });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(variables.id, selectedOrgId),
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};

export const useConvertLead = () => {
  const queryClient = useQueryClient();
  const selectedOrgId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );

  return useMutation({
    mutationFn: ({ id }: { id: string }) => leadsService.convertLead(id),
    onSuccess: (_, variables) => {
      toast.success("Lead converted to prospect");
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.listScope });
      queryClient.invalidateQueries({ queryKey: queryKeys.prospects.listScope });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(variables.id, selectedOrgId),
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};

export const useImportLeads = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => leadsService.importLeads(formData),
    onSuccess: (data: LeadImportResult) => {
      const successCount = data?.successCount ?? data?.count ?? 0;
      const failedCount = data?.failed?.length ?? 0;

      if (failedCount > 0) {
        toast.warning(
          `Import finished: ${successCount} leads imported, ${failedCount} rows failed.`
        );
      } else {
        toast.success(`Successfully imported ${successCount} leads`);
      }
      
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.listScope });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};
