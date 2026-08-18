import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import { billingService } from "../api/services";
import type {
  CancelPayload,
  FeatureOverridesPayload,
  PlanPayload,
  SubscriptionListParams,
  SubscriptionPayload,
} from "../types";

/**
 * Platform billing console.
 *
 * Every hook here is super-admin only. The backend enforces that with
 * BILLING_MANAGE / PLAN_MANAGE; the `enabled` guards simply stop an admin's
 * browser firing requests it will only ever get a 403 from.
 */

const useIsSuperAdmin = () =>
  useAppSelector((s) => s.auth.user?.role) === ROLES.SUPER_ADMIN;

export const useSubscriptions = (params?: SubscriptionListParams) => {
  const isSuperAdmin = useIsSuperAdmin();

  return useQuery({
    queryKey: queryKeys.billing.subscriptions(params),
    queryFn: () => billingService.getSubscriptions(params),
    enabled: isSuperAdmin,
    placeholderData: keepPreviousData,
  });
};

export const useSubscriptionByOrganization = (organizationId?: string) => {
  const isSuperAdmin = useIsSuperAdmin();

  return useQuery({
    queryKey: queryKeys.billing.subscriptionByOrg(organizationId ?? ""),
    queryFn: () => billingService.getSubscriptionByOrganization(organizationId!),
    enabled: isSuperAdmin && Boolean(organizationId),
  });
};

/** Live organizations with no subscription — the stranded set to repair. */
export const useOrganizationsWithoutSubscription = () => {
  const isSuperAdmin = useIsSuperAdmin();

  return useQuery({
    queryKey: queryKeys.billing.unsubscribedOrganizations,
    queryFn: () => billingService.getOrganizationsWithoutSubscription(),
    enabled: isSuperAdmin,
  });
};

/**
 * Invalidate everything billing-shaped after a change.
 *
 * Coarse on purpose: a plan edit changes the console list, the tenant's own
 * subscription view, the usage limits and the banner. Enumerating those keys
 * precisely would be a bug farm for no measurable gain — these are small,
 * infrequent queries.
 */
const useBillingInvalidation = () => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
};

export const useAssignInitialPlan = () => {
  const invalidate = useBillingInvalidation();

  return useMutation({
    mutationFn: ({
      organizationId,
      planId,
    }: {
      organizationId: string;
      planId: string;
    }) => billingService.assignInitialPlan(organizationId, planId),
    onSuccess: (response) => {
      toast.success(`Subscription created on ${response.data?.plan.name}`);
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};

export const useUpdateSubscription = () => {
  const invalidate = useBillingInvalidation();

  return useMutation({
    mutationFn: ({
      organizationId,
      payload,
    }: {
      organizationId: string;
      payload: SubscriptionPayload;
    }) => billingService.updateSubscription(organizationId, payload),
    onSuccess: (response) => {
      const name = response.data?.organizationName ?? "Organization";
      toast.success(`${name} updated to ${response.data?.plan.name}`);
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};

export const useUpdateFeatureOverrides = () => {
  const invalidate = useBillingInvalidation();

  return useMutation({
    mutationFn: ({
      organizationId,
      payload,
    }: {
      organizationId: string;
      payload: FeatureOverridesPayload;
    }) => billingService.updateFeatureOverrides(organizationId, payload),
    onSuccess: (response) => {
      const custom = (response.data?.features ?? []).filter(
        (feature) => feature.origin === "override",
      ).length;
      toast.success(
        custom === 0
          ? "Custom terms cleared — this organization now follows the plan"
          : `${custom} custom term${custom === 1 ? "" : "s"} saved`,
      );
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};

export const useCancelSubscription = () => {
  const invalidate = useBillingInvalidation();

  return useMutation({
    mutationFn: ({
      organizationId,
      payload,
    }: {
      organizationId: string;
      payload: CancelPayload;
    }) => billingService.cancelSubscription(organizationId, payload),
    onSuccess: (response) => {
      toast.success(
        response.data?.cancelAtPeriodEnd
          ? "Cancelled. Access continues until the end of the paid period."
          : "Cancelled. Access ends immediately.",
      );
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};

export const useCreatePlan = () => {
  const invalidate = useBillingInvalidation();

  return useMutation({
    mutationFn: (payload: PlanPayload) => billingService.createPlan(payload),
    onSuccess: (response) => {
      toast.success(`Plan "${response.data?.name}" created`);
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};

export const useUpdatePlan = () => {
  const invalidate = useBillingInvalidation();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<PlanPayload>;
    }) => billingService.updatePlan(id, payload),
    onSuccess: (response) => {
      toast.success(`Plan "${response.data?.name}" updated`);
      invalidate();
    },
    onError: (error) => toast.error(extractApiError(error).message),
  });
};
