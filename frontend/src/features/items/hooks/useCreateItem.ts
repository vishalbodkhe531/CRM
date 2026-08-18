import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { itemsService } from "../api/services";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import type { CreateItemPayload, GSTRate } from "../types";

export const useCreateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateItemPayload) => {
      const payload: CreateItemPayload = {
        ...data,
        gstRate: data.gstRate as GSTRate,
        itemCode: data.itemCode ?? "",
        hsnCode: data.hsnCode ?? "",
        sacCode: data.sacCode ?? "",
        description: data.description ?? "",
      };
      return await itemsService.createItem(payload);
    },
    onSuccess: () => {
      toast.success("Item created successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.items.listScope });
      queryClient.invalidateQueries({ queryKey: queryKeys.items.statsScope });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};
