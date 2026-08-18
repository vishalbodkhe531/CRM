import { Router } from "express";
import { billingController } from "./billing.controller";
import { allowPermission } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireOrganization } from "../../middlewares/organization.middleware";
import { validateData } from "../../middlewares/validationMiddleware";
import {
  AssignInitialPlanSchema,
  CancelSubscriptionSchema,
  CreatePlanSchema,
  UpdateFeatureOverridesSchema,
  UpdatePlanSchema,
  UpdateSubscriptionSchema,
} from "../../contracts/validation";

const router = Router();

router.use(requireAuth);

/**
 * enforceSubscription is deliberately NOT mounted here.
 *
 * This is the module a lapsed tenant has to be able to reach in order to find
 * out what happened and pay. Blocking it would be circular. Everything that
 * mutates below is super-admin only anyway.
 */

/**
 * ⚠️ "/subscriptions" must stay ABOVE "/subscription".
 *
 * Express matches in declaration order and these differ by one character, so the
 * shorter literal declared first would still not swallow the longer one — but
 * keeping the platform routes grouped and ordered makes that non-accidental.
 */

// ------------------------------ Tenant surface ------------------------------
// Read-only. requireOrganization lets a super-admin scope into a tenant via the
// x-organization-id header, exactly as the rest of the app does.

router.get(
  "/plans",
  allowPermission(PERMISSIONS.BILLING_READ),
  billingController.getPlans,
);

// --------------------------- Platform surface -------------------------------
// Declared before "/subscription" so the parameterised platform routes cannot be
// shadowed by the tenant one.

router.post(
  "/plans",
  allowPermission(PERMISSIONS.PLAN_MANAGE),
  validateData(CreatePlanSchema),
  billingController.createPlan,
);

router.patch(
  "/plans/:id",
  allowPermission(PERMISSIONS.PLAN_MANAGE),
  validateData(UpdatePlanSchema),
  billingController.updatePlan,
);

router.get(
  "/subscriptions",
  allowPermission(PERMISSIONS.BILLING_MANAGE),
  billingController.getSubscriptions,
);

// Distinct literal path (not under /subscriptions/:organizationId) so it cannot
// be captured as an organizationId param.
router.get(
  "/unsubscribed-organizations",
  allowPermission(PERMISSIONS.BILLING_MANAGE),
  billingController.getOrganizationsWithoutSubscription,
);

router.get(
  "/subscriptions/:organizationId",
  allowPermission(PERMISSIONS.BILLING_MANAGE),
  billingController.getSubscriptionByOrganization,
);

/**
 * Assign the FIRST subscription to an org that has none — the repair path for
 * organizations created before billing was wired into org creation. Distinct
 * from PATCH (which requires an existing row): this creates, and 409s if a row
 * already exists.
 */
router.post(
  "/subscriptions/:organizationId",
  allowPermission(PERMISSIONS.BILLING_MANAGE),
  validateData(AssignInitialPlanSchema),
  billingController.assignInitialPlan,
);

router.patch(
  "/subscriptions/:organizationId",
  allowPermission(PERMISSIONS.BILLING_MANAGE),
  validateData(UpdateSubscriptionSchema),
  billingController.updateSubscription,
);

/**
 * PUT, not PATCH: the payload is the COMPLETE override set for the organization.
 * Keys omitted are removed, which is what makes "revert this customer to plan
 * terms" expressible at all.
 */
router.put(
  "/subscriptions/:organizationId/features",
  allowPermission(PERMISSIONS.BILLING_MANAGE),
  validateData(UpdateFeatureOverridesSchema),
  billingController.updateFeatureOverrides,
);

router.post(
  "/subscriptions/:organizationId/cancel",
  allowPermission(PERMISSIONS.BILLING_MANAGE),
  validateData(CancelSubscriptionSchema),
  billingController.cancelSubscription,
);

// ------------------------- Tenant surface (scoped) --------------------------

router.get(
  "/subscription",
  allowPermission(PERMISSIONS.BILLING_READ),
  requireOrganization,
  billingController.getMySubscription,
);

/**
 * Safe subscription status for gating UI. Deliberately NOT gated by BILLING_READ:
 * a manager/executive whose write was blocked must be able to learn why, and the
 * payload carries only the derived state + toggle features — no plan or pricing.
 */
router.get(
  "/subscription/status",
  requireOrganization,
  billingController.getMySubscriptionStatus,
);

router.get(
  "/usage",
  allowPermission(PERMISSIONS.BILLING_READ),
  requireOrganization,
  billingController.getUsage,
);

export default router;
