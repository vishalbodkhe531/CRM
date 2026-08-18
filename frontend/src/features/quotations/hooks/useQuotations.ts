import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { quotationsService } from "../api/services";
import type { QuotationStatus } from "@/contracts/types";
import type { QuotationFilterValues, QuotationFormValues } from "../types";
import type { UserPreview } from "@/features/leads/types";
import { useAppSelector } from "@/hooks/useRedux";
import { extractApiError } from "@/utils/apiError";
import { toast } from "@/utils/toast";

type CreateQuotationPayload = Parameters<
  typeof quotationsService.createQuotation
>[0];
type QuotationUpdatePayload = Parameters<
  typeof quotationsService.updateQuotation
>[1];

export const useQuotations = (
  params?: QuotationFilterValues,
  assignableUsers: UserPreview[] = [],
) => {
  const queryClient = useQueryClient();
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);
  const user = useAppSelector((state) => state.auth.user);

  // Enabled if organization ID is set, OR if user is a normal user (Admin, Manager, Executive) where backend scopes by default
  const isEnabled = user ? (user.role === "SUPER_ADMIN" ? !!selectedOrgId : true) : false;

  // 1. Fetch filtered and paginated list of quotations
  const listQuery = useQuery({
    queryKey: queryKeys.quotations.list(params, selectedOrgId),
    queryFn: async () => {
      const res = await quotationsService.getQuotations(params);
      return {
        data: res.data || [],
        meta: res.meta || { page: 1, limit: 10, total: 0, totalPages: 0, missedFollowUps: 0 },
      };
    },
    placeholderData: keepPreviousData,
    enabled: isEnabled,
  });

  // 2. Fetch all quotations statistics from the backend
  const statsQuery = useQuery({
    queryKey: [...queryKeys.quotations.all, "stats", selectedOrgId],
    queryFn: async () => {
      return await quotationsService.getQuotationStats();
    },
    enabled: isEnabled,
  });

  // Get live global stats directly from the backend response
  const stats = useMemo(() => {
    return statsQuery.data || { total: 0, pending: 0, approved: 0, rejected: 0 };
  }, [statsQuery.data]);

  // Map assignees dynamically for presentation
  const mappedQuotations = useMemo(() => {
    const rawList = listQuery.data?.data || [];
    return rawList.map((q) => {
      let assignedUser = assignableUsers.find((u) => u.id === q.assignedToId);

      // Fallback for mock representation if not found in assignableUsers list
      if (!assignedUser && q.assignedToId === "user-ramesh") {
        assignedUser = assignableUsers.find(
          (u) =>
            u.firstName.toLowerCase() === "ramesh" ||
            u.lastName.toLowerCase() === "patil",
        );
        if (!assignedUser) {
          return {
            ...q,
            assignedTo: {
              id: "user-ramesh",
              firstName: "Ramesh",
              lastName: "Patil",
            },
          };
        }
      }

      return {
        ...q,
        assignedTo: assignedUser
          ? {
              id: assignedUser.id,
              firstName: assignedUser.firstName,
              lastName: assignedUser.lastName,
            }
          : q.assignedTo || null,
      };
    });
  }, [listQuery.data?.data, assignableUsers]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: CreateQuotationPayload) =>
      quotationsService.createQuotation(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
    onError: (error) => {
      toast.error(extractApiError(error).message ?? "Failed to create quotation");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: QuotationUpdatePayload;
    }) =>
      quotationsService.updateQuotation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
    onError: (error) => {
      toast.error(extractApiError(error).message ?? "Failed to update quotation");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotationsService.deleteQuotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
    onError: (error) => {
      toast.error(extractApiError(error).message ?? "Failed to delete quotation");
    },
  });

  // DTO adaptation wrapper methods
  const createQuotation = async (values: QuotationFormValues) => {
    return await createMutation.mutateAsync(values as CreateQuotationPayload);
  };

  const updateStatus = async (id: string, status: QuotationStatus) => {
    await updateMutation.mutateAsync({ id, payload: { status } });
  };

  const assignQuotation = async (id: string, assignedToId: string) => {
    await updateMutation.mutateAsync({
      id,
      payload: {
        assignedToId: assignedToId || null,
      } as QuotationUpdatePayload,
    });
  };

  const deleteQuotation = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const updateQuotation = async (id: string, values: QuotationFormValues) => {
    await updateMutation.mutateAsync({
      id,
      payload: values as QuotationUpdatePayload,
    });
  };

  return {
    data: {
      data: mappedQuotations,
      meta: listQuery.data?.meta,
    },
    isLoading: listQuery.isLoading || statsQuery.isLoading,
    stats,
    mutations: {
      createQuotation,
      updateQuotation,
      updateStatus,
      assignQuotation,
      deleteQuotation,
    },
  };
};

export const useQuotationDetail = (id: string | undefined) => {
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user
    ? user.role === "SUPER_ADMIN"
      ? !!selectedOrgId
      : true
    : false;

  return useQuery({
    queryKey: id ? queryKeys.quotations.detail(id, selectedOrgId) : queryKeys.quotations.all,
    queryFn: async () => {
      if (!id) return null;
      return await quotationsService.getQuotationDetail(id);
    },
    enabled: !!id && isEnabled,
  });
};

