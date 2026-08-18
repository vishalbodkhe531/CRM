import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { itemsService } from "../api/services";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import type { Item } from "../types";

interface ItemListCache {
  data?: Item[];
}

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  const selectedOrgId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );

  return useMutation({
    mutationFn: async (id: string) => {
      return await itemsService.deleteItem(id);
    },
    // Optimistic Update logic
    onMutate: async (id) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.items.listScope });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKeys.items.listScope);

      // Optimistically update to the new value
      queryClient.setQueriesData(
        { queryKey: queryKeys.items.listScope },
        (old: ItemListCache | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data?.filter((item) => item.id !== id),
          };
        }
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onSuccess: (_, id) => {
      toast.success("Item deleted successfully");
      queryClient.removeQueries({
        queryKey: queryKeys.items.detail(id, selectedOrgId),
      });
    },
    onError: (error, _id, context) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.items.listScope, context.previousData);
      }
      
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.items.listScope });
      queryClient.invalidateQueries({ queryKey: queryKeys.items.statsScope });
    },
  });
};
