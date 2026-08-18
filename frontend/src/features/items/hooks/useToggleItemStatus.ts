import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { itemsService } from "../api/services";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";

export const useToggleItemStatus = () => {
  const queryClient = useQueryClient();
  const selectedOrgId = useAppSelector(
    (state) => state.auth.selectedOrganizationId,
  );

  return useMutation({
    mutationFn: async (id: string) => {
      return await itemsService.toggleItemStatus(id);
    },
    onSuccess: (_, id) => {
      toast.success("Item status updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.items.listScope });
      queryClient.invalidateQueries({ queryKey: queryKeys.items.statsScope });
      queryClient.invalidateQueries({
        queryKey: queryKeys.items.detail(id, selectedOrgId),
      });
    },
    onError: (error) => {
      const apiError = extractApiError(error);
      toast.error(apiError.message);
    },
  });
};
