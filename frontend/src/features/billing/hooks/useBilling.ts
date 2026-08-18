import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import { extractApiError } from "@/utils/apiError";
import { billingService } from "../api/services";
import type { FeatureKey, PlanListParams } from "../types";

/**
 * A 404 here is not a transient failure — it means the organization has no plan
 * assigned yet. Retrying it just turns one clear "no subscription" state into a
 * burst of failed requests, so callers stop retrying on it and render a distinct
 * message instead.
 */
export const isNoSubscriptionError = (error: unknown): boolean =>
  extractApiError(error).status === 404;

/**
 * Billing reads for the signed-in tenant.
 *
 * A super-admin has no organization of their own, so the subscription and usage
 * queries only run once they have scoped into a tenant workspace — otherwise the
 * backend would (correctly) reject the request and the hook would spin on an
 * error the user cannot act on.
 */

const useTenantScope = () => {
  const user = useAppSelector((s) => s.auth.user);
  const selectedOrgId = useAppSelector((s) => s.auth.selectedOrganizationId);

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const organizationId = isSuperAdmin
    ? selectedOrgId
    : (user?.organizationId ?? null);

  return {
    user,
    isSuperAdmin,
    organizationId,
    /** Admin and super-admin are the only roles granted BILLING_READ. */
    canReadBilling:
      user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN,
  };
};

export const useSubscription = () => {
  const { organizationId, canReadBilling } = useTenantScope();

  return useQuery({
    queryKey: queryKeys.billing.subscription(organizationId),
    queryFn: () => billingService.getMySubscription(),
    enabled: canReadBilling && Boolean(organizationId),
    staleTime: 60_000,
    // Don't hammer a "no subscription" 404 — it will not resolve on retry.
    retry: (failureCount, error) =>
      !isNoSubscriptionError(error) && failureCount < 2,
  });
};

export const useUsage = () => {
  const { organizationId, canReadBilling } = useTenantScope();

  return useQuery({
    queryKey: queryKeys.billing.usage(organizationId),
    queryFn: () => billingService.getUsage(),
    enabled: canReadBilling && Boolean(organizationId),
    // Counts drift constantly and drive no gating decision on the client — the
    // server is the authority. Five minutes keeps the page cheap.
    staleTime: 5 * 60_000,
  });
};

/**
 * Safe subscription status for EVERY tenant role (manager/executive included).
 *
 * Unlike useSubscription (billing-read only), this backs the subscription banner
 * and client feature gates for all roles, so a lower role learns why a write was
 * blocked and does not default a plan toggle to "on". The endpoint fails open
 * server-side, so it never 404s the way the billing-read subscription can.
 */
export const useSubscriptionStatus = () => {
  const { organizationId } = useTenantScope();

  return useQuery({
    queryKey: queryKeys.billing.subscriptionStatus(organizationId),
    queryFn: () => billingService.getMySubscriptionStatus(),
    enabled: Boolean(organizationId),
    staleTime: 60_000,
  });
};

export const usePlans = (params?: PlanListParams) => {
  const { canReadBilling } = useTenantScope();

  return useQuery({
    queryKey: queryKeys.billing.plans(params),
    queryFn: () => billingService.getPlans(params),
    enabled: canReadBilling,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
};

/**
 * Subscription state for gating UI.
 *
 * Returns permissive defaults while loading or when the caller cannot read
 * billing: a banner that flashes "expired" during a refetch, or a create button
 * disabled because a query has not resolved, is worse than briefly showing
 * nothing. The server is the real gate — this only shapes the UI.
 */
/**
 * Whether a plan TOGGLE feature is enabled for the current tenant.
 *
 * Reads from the all-roles status endpoint so the gate is authoritative for
 * manager/executive too, instead of defaulting to enabled just because they
 * cannot read billing. This is the only enforcement for QUOTATION_PDF (generated
 * client-side, no server gate). Permissive only while loading or when the org has
 * no subscription (fail-open, matching the server).
 */
export const useFeatureEnabled = (key: FeatureKey): boolean => {
  const { data } = useSubscriptionStatus();
  const features = data?.data?.features;
  if (!features) return true;

  return features[key] ?? true;
};

export const useSubscriptionState = () => {
  const { data, isLoading } = useSubscription();
  const subscription = data?.data;

  return {
    subscription,
    isLoading,
    isReadOnly: subscription?.isReadOnly ?? false,
    isWarning: subscription?.isWarning ?? false,
    reason: subscription?.reason ?? null,
    effectiveStatus: subscription?.effectiveStatus ?? null,
    daysRemaining: subscription?.daysRemaining ?? null,
  };
};
