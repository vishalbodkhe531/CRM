import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { itemsService } from "../api/services";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import type { UpdateItemPayload, GSTRate } from "../types";

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  const selectedOrgId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemPayload }) => {
      const payload = {
        ...data,
        ...("gstRate" in data ? { gstRate: data.gstRate as GSTRate } : {}),
      } as UpdateItemPayload;
      return await itemsService.updateItem(id, payload);
    },
    onSuccess: (_, variables) => {
      toast.success("Item updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.items.listScope });
      queryClient.invalidateQueries({ queryKey: queryKeys.items.statsScope });
      queryClient.invalidateQueries({
        queryKey: queryKeys.items.detail(variables.id, selectedOrgId),
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};
