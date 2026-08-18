import { Request, Response } from "express";
import { billingService } from "./billing.service";
import { ApiResponse } from "../../utils/response/response";
import { AppError } from "../../utils/errors/appError";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { logger } from "../../config/logger";
import { recordAudit } from "../../utils/audit/recordAudit";
import { pickFields } from "../audit/audit.service";
import {
  AssignInitialPlanSchema,
  PlanFilterSchema,
  SubscriptionFilterSchema,
} from "../../contracts/validation";
import type { PlanSummary, SubscriptionSummary } from "../../contracts/types";

/**
 * Billing Controller - HTTP boundary for plans and subscriptions.
 *
 * Tenant surface (plans list, own subscription, usage) is read-only.
 * Everything that changes money is super-admin only while billing is operated
 * manually (decision D2).
 */

const AUDITED_PLAN_FIELDS = [
  "id",
  "code",
  "slug",
  "name",
  "priceMinor",
  "currency",
  "billingCycle",
  "trialDays",
  "isActive",
  "isPublic",
] as const;

const AUDITED_SUBSCRIPTION_FIELDS = [
  "id",
  "organizationId",
  "status",
  "effectiveStatus",
  "trialEndsAt",
  "currentPeriodStart",
  "currentPeriodEnd",
  "cancelAtPeriodEnd",
  "cancelledAt",
] as const;

/**
 * Flatten feature values into the snapshot.
 *
 * Feature rows are the substance of a plan change now that limits are data — a
 * diff showing only price and name would omit the part that actually alters what
 * a customer can do.
 */
const flattenFeatures = (
  features: { key: string; valueInt: number | null; valueBool: boolean | null }[],
) =>
  features.reduce<Record<string, unknown>>((acc, feature) => {
    acc[`feature.${feature.key}`] =
      feature.valueBool !== null
        ? feature.valueBool
        : (feature.valueInt ?? "unlimited");
    return acc;
  }, {});

const planSnapshot = (plan: PlanSummary) => ({
  ...pickFields(plan, AUDITED_PLAN_FIELDS),
  ...flattenFeatures(plan.features),
});

/** Plan code is flattened in so a diff shows the move, not two opaque uuids. */
const subscriptionSnapshot = (subscription: SubscriptionSummary) => ({
  ...pickFields(subscription, AUDITED_SUBSCRIPTION_FIELDS),
  planCode: subscription.plan.code,
  planName: subscription.plan.name,
  ...flattenFeatures(subscription.features),
});

const requireIdParam = (req: Request, name: string): string => {
  const value = req.params[name];

  if (!value || typeof value !== "string") {
    throw AppError.validation.badRequest(`Valid ${name} is required`);
  }

  return value;
};

const requireActor = (req: Request) => {
  if (!req.user) {
    throw AppError.authentication.unauthorized("User not authenticated");
  }

  return {
    id: req.user.id,
    role: req.user.role,
    organizationId: req.user.organizationId,
  };
};

// ============================== Tenant surface ==============================

// GET /billing/plans - Plan catalogue
const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const query = PlanFilterSchema.parse(req.query);
  const actor = requireActor(req);

  const result = await billingService.getPlans(query, actor);

  return ApiResponse.ok(res, result.data, "Plans retrieved", result.meta);
});

// GET /billing/subscription - My organization's subscription
const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);

  const subscription = await billingService.getMySubscription(
    actor,
    req.organizationId,
  );

  return ApiResponse.ok(res, subscription, "Subscription retrieved");
});

// GET /billing/subscription/status - Safe subscription state for ANY tenant role
const getMySubscriptionStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const actor = requireActor(req);

    const status = await billingService.getMySubscriptionStatus(
      actor,
      req.organizationId,
    );

    return ApiResponse.ok(res, status, "Subscription status retrieved");
  },
);

// GET /billing/usage - Usage against plan limits
const getUsage = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);

  const usage = await billingService.getUsage(actor, req.organizationId);

  return ApiResponse.ok(res, usage, "Usage retrieved");
});

// ============================ Platform surface =============================

// POST /billing/plans - Create a plan
const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);

  const plan = await billingService.createPlan(req.body);

  logger.info("Plan created", {
    userId: actor.id,
    planId: plan.id,
    code: plan.code,
  });

  await recordAudit(req, {
    action: "PLAN_CREATED",
    entityType: "PLAN",
    entityId: plan.id,
    after: planSnapshot(plan),
  });

  return ApiResponse.created(res, plan, "Plan created");
});

// PATCH /billing/plans/:id - Update a plan
const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const id = requireIdParam(req, "id");

  const previous = await billingService.getPlanById(id);
  const plan = await billingService.updatePlan(id, req.body);

  await recordAudit(req, {
    action: "PLAN_UPDATED",
    entityType: "PLAN",
    entityId: plan.id,
    before: planSnapshot(previous),
    after: planSnapshot(plan),
  });

  return ApiResponse.ok(res, plan, "Plan updated");
});

// GET /billing/subscriptions - Every organization's subscription
const getSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const query = SubscriptionFilterSchema.parse(req.query);

  const result = await billingService.getSubscriptions(query);

  return ApiResponse.ok(
    res,
    result.data,
    "Subscriptions retrieved",
    result.meta,
  );
});

// GET /billing/subscriptions/:organizationId - One organization's subscription
const getSubscriptionByOrganization = asyncHandler(
  async (req: Request, res: Response) => {
    const organizationId = requireIdParam(req, "organizationId");

    const subscription =
      await billingService.getSubscriptionByOrganization(organizationId);

    return ApiResponse.ok(res, subscription, "Subscription retrieved");
  },
);

// PATCH /billing/subscriptions/:organizationId - Assign plan / set period
const updateSubscription = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = requireIdParam(req, "organizationId");
  const actor = requireActor(req);

  const before =
    await billingService.getSubscriptionByOrganization(organizationId);
  const { subscription, planChanged } = await billingService.updateSubscription(
    organizationId,
    req.body,
  );

  logger.info("Subscription updated", {
    userId: actor.id,
    organizationId,
    planChanged,
    effectiveStatus: subscription.effectiveStatus,
  });

  await recordAudit(req, {
    // A plan move is a commercial event and gets its own action rather than
    // being buried in a generic update.
    action: planChanged ? "SUBSCRIPTION_PLAN_CHANGED" : "SUBSCRIPTION_UPDATED",
    entityType: "SUBSCRIPTION",
    entityId: subscription.id,
    organizationId,
    before: subscriptionSnapshot(before),
    after: subscriptionSnapshot(subscription),
  });

  return ApiResponse.ok(res, subscription, "Subscription updated");
});

// PUT /billing/subscriptions/:organizationId/features - Replace feature overrides
const updateFeatureOverrides = asyncHandler(
  async (req: Request, res: Response) => {
    const organizationId = requireIdParam(req, "organizationId");
    const actor = requireActor(req);

    const before =
      await billingService.getSubscriptionByOrganization(organizationId);
    const subscription = await billingService.updateFeatureOverrides(
      organizationId,
      req.body,
    );

    logger.info("Subscription feature overrides replaced", {
      userId: actor.id,
      organizationId,
      count: req.body?.overrides?.length ?? 0,
    });

    await recordAudit(req, {
      action: "SUBSCRIPTION_UPDATED",
      entityType: "SUBSCRIPTION",
      entityId: subscription.id,
      organizationId,
      before: subscriptionSnapshot(before),
      after: subscriptionSnapshot(subscription),
    });

    return ApiResponse.ok(res, subscription, "Feature overrides updated");
  },
);

// POST /billing/subscriptions/:organizationId/cancel - Cancel
const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = requireIdParam(req, "organizationId");
  const actor = requireActor(req);

  const before =
    await billingService.getSubscriptionByOrganization(organizationId);
  const subscription = await billingService.cancelSubscription(
    organizationId,
    req.body,
  );

  logger.info("Subscription cancelled", {
    userId: actor.id,
    organizationId,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  });

  await recordAudit(req, {
    action: "SUBSCRIPTION_CANCELLED",
    entityType: "SUBSCRIPTION",
    entityId: subscription.id,
    organizationId,
    before: subscriptionSnapshot(before),
    after: subscriptionSnapshot(subscription),
  });

  return ApiResponse.ok(res, subscription, "Subscription cancelled");
});

// GET /billing/unsubscribed-organizations - Live orgs with no subscription
const getOrganizationsWithoutSubscription = asyncHandler(
  async (_req: Request, res: Response) => {
    const organizations =
      await billingService.getOrganizationsWithoutSubscription();
    return ApiResponse.ok(
      res,
      organizations,
      "Organizations without a subscription retrieved",
    );
  },
);

// POST /billing/subscriptions/:organizationId - Assign the first subscription
const assignInitialPlan = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = requireIdParam(req, "organizationId");
  const actor = requireActor(req);
  const { planId } = AssignInitialPlanSchema.parse(req.body);

  const subscription = await billingService.assignInitialPlan(
    organizationId,
    planId,
  );

  logger.info("Initial subscription assigned", {
    userId: actor.id,
    organizationId,
    planId,
    effectiveStatus: subscription.effectiveStatus,
  });

  await recordAudit(req, {
    action: "SUBSCRIPTION_CREATED",
    entityType: "SUBSCRIPTION",
    entityId: subscription.id,
    organizationId,
    after: subscriptionSnapshot(subscription),
  });

  return ApiResponse.created(res, subscription, "Subscription created");
});

export const billingController = {
  getPlans,
  getMySubscription,
  getMySubscriptionStatus,
  getUsage,
  createPlan,
  updatePlan,
  getSubscriptions,
  getOrganizationsWithoutSubscription,
  getSubscriptionByOrganization,
  assignInitialPlan,
  updateSubscription,
  updateFeatureOverrides,
  cancelSubscription,
};
