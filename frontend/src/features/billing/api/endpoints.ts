export const BILLING_ENDPOINTS = {
  // Tenant surface (read-only)
  PLANS: "/billing/plans",
  MY_SUBSCRIPTION: "/billing/subscription",
  /** Safe subscription state for gating UI — readable by every tenant role. */
  MY_SUBSCRIPTION_STATUS: "/billing/subscription/status",
  USAGE: "/billing/usage",

  // Platform surface (super-admin)
  CREATE_PLAN: "/billing/plans",
  UPDATE_PLAN: (id: string) => `/billing/plans/${id}`,
  SUBSCRIPTIONS: "/billing/subscriptions",
  UNSUBSCRIBED_ORGANIZATIONS: "/billing/unsubscribed-organizations",
  SUBSCRIPTION_BY_ORG: (organizationId: string) =>
    `/billing/subscriptions/${organizationId}`,
  SUBSCRIPTION_FEATURES: (organizationId: string) =>
    `/billing/subscriptions/${organizationId}/features`,
  CANCEL_SUBSCRIPTION: (organizationId: string) =>
    `/billing/subscriptions/${organizationId}/cancel`,
};
