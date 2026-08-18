import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import { signupRequestsService } from "../api/services";
import type {
  SignupRequestListParams,
  SignupRequestStatusPayload,
} from "../types";

export const useSignupRequests = (params?: SignupRequestListParams) => {
  const user = useAppSelector((s) => s.auth.user);

  return useQuery({
    queryKey: queryKeys.signupRequests.list(params),
    queryFn: () => signupRequestsService.getSignupRequests(params),
    placeholderData: keepPreviousData,
    enabled: user?.role === ROLES.SUPER_ADMIN,
  });
};

export const useSignupRequestDetail = (id?: string) => {
  const user = useAppSelector((s) => s.auth.user);

  return useQuery({
    queryKey: id
      ? queryKeys.signupRequests.detail(id)
      : queryKeys.signupRequests.all,
    queryFn: async () => {
      if (!id) return null;
      return signupRequestsService.getSignupRequestDetail(id);
    },
    enabled: Boolean(id) && user?.role === ROLES.SUPER_ADMIN,
  });
};

export const useUpdateSignupRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: SignupRequestStatusPayload;
    }) => signupRequestsService.updateSignupRequestStatus(id, data),
    onSuccess: (request) => {
      toast.success("Signup request updated");
      queryClient.invalidateQueries({
        queryKey: queryKeys.signupRequests.listScope,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.signupRequests.detail(request.id),
      });
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};
