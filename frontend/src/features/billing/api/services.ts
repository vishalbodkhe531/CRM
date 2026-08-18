import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type {
  BillingUsage,
  PlanSummary,
  SubscriptionStatus,
  SubscriptionSummary,
} from "@/contracts/types";
import type {
  CancelPayload,
  FeatureOverridesPayload,
  PlanListParams,
  PlanPayload,
  SubscriptionListParams,
  SubscriptionPayload,
  UnsubscribedOrganization,
} from "../types";
import { BILLING_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

/** Lean, non-sensitive subscription state readable by every tenant role. */
export interface SubscriptionStatusSummary {
  effectiveStatus: SubscriptionStatus;
  isReadOnly: boolean;
  isWarning: boolean;
  daysRemaining: number | null;
  reason: string | null;
  /** Resolved plan TOGGLE features (e.g. QUOTATION_PDF), keyed by feature key. */
  features: Record<string, boolean>;
}

export const billingService = {
  // --- Tenant surface ---
  getPlans: (params?: PlanListParams) =>
    service.get<PlanSummary[]>(BILLING_ENDPOINTS.PLANS, { params }),

  getMySubscription: () =>
    service.get<SubscriptionSummary>(BILLING_ENDPOINTS.MY_SUBSCRIPTION),

  getMySubscriptionStatus: () =>
    service.get<SubscriptionStatusSummary>(
      BILLING_ENDPOINTS.MY_SUBSCRIPTION_STATUS,
    ),

  getUsage: () => service.get<BillingUsage>(BILLING_ENDPOINTS.USAGE),

  // --- Platform surface ---
  getSubscriptions: (params?: SubscriptionListParams) =>
    service.get<SubscriptionSummary[]>(BILLING_ENDPOINTS.SUBSCRIPTIONS, {
      params,
    }),

  getSubscriptionByOrganization: (organizationId: string) =>
    service.get<SubscriptionSummary>(
      BILLING_ENDPOINTS.SUBSCRIPTION_BY_ORG(organizationId),
    ),

  getOrganizationsWithoutSubscription: () =>
    service.get<UnsubscribedOrganization[]>(
      BILLING_ENDPOINTS.UNSUBSCRIBED_ORGANIZATIONS,
    ),

  createPlan: (payload: PlanPayload) =>
    service.post<PlanSummary, PlanPayload>(
      BILLING_ENDPOINTS.CREATE_PLAN,
      payload,
    ),

  updatePlan: (id: string, payload: Partial<PlanPayload>) =>
    service.patch<PlanSummary, Partial<PlanPayload>>(
      BILLING_ENDPOINTS.UPDATE_PLAN(id),
      payload,
    ),

  /** Assign the first subscription to an org that has none (repair path). */
  assignInitialPlan: (organizationId: string, planId: string) =>
    service.post<SubscriptionSummary, { planId: string }>(
      BILLING_ENDPOINTS.SUBSCRIPTION_BY_ORG(organizationId),
      { planId },
    ),

  updateSubscription: (organizationId: string, payload: SubscriptionPayload) =>
    service.patch<SubscriptionSummary, SubscriptionPayload>(
      BILLING_ENDPOINTS.SUBSCRIPTION_BY_ORG(organizationId),
      payload,
    ),

  /** PUT: the payload is the complete override set; omissions are deletions. */
  updateFeatureOverrides: (
    organizationId: string,
    payload: FeatureOverridesPayload,
  ) =>
    service.put<SubscriptionSummary, FeatureOverridesPayload>(
      BILLING_ENDPOINTS.SUBSCRIPTION_FEATURES(organizationId),
      payload,
    ),

  cancelSubscription: (organizationId: string, payload: CancelPayload) =>
    service.post<SubscriptionSummary, CancelPayload>(
      BILLING_ENDPOINTS.CANCEL_SUBSCRIPTION(organizationId),
      payload,
    ),
};
