import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { billingRepository } from "../modules/billing/billing.repository";
import { resolveToggle } from "../utils/business/feature.utils";
import { AppError } from "../utils/errors/appError";
import { asyncHandler } from "../utils/middleware/asyncHandler";
import { logger } from "../config/logger";
import { FEATURE_DEFINITIONS, type FeatureKey } from "../contracts/constants";

/**
 * Plan-feature gate.
 *
 * Blocks access to a feature whose plan toggle is off — leads, prospects and the
 * like are LIMITS (guarded per-create in the services); audit access,
 * announcements and quotation PDF are TOGGLES, guarded here at the route.
 *
 * Unlike enforceSubscription, this gates reads too: "your plan does not include
 * announcements" applies to viewing the authoring surface, not only to writing.
 * Mount it AFTER requireAuth on the specific routes a toggle governs.
 *
 * Super-admin is exempt — the platform operator configuring or inspecting a
 * tenant must not be walled out of a feature the tenant has not bought. Fails
 * open when the org has no subscription, matching every other enforcement point.
 */
export const requireFeature = (featureKey: FeatureKey) => {
  const definition = FEATURE_DEFINITIONS[featureKey];
  if (definition.kind !== "toggle") {
    // A programming error, caught at mount time in dev rather than per request.
    throw new Error(`requireFeature expects a toggle, got limit "${featureKey}"`);
  }

  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const user = req.user;
      if (!user) {
        // requireAuth runs first; defer rather than invent an error here.
        return next();
      }

      if (user.role === Role.SUPER_ADMIN) {
        return next();
      }

      const organizationId = user.organizationId;
      if (!organizationId) {
        return next();
      }

      const subscription =
        await billingRepository.findSubscriptionByOrganizationId(organizationId);

      if (!subscription) {
        logger.warn("Feature check skipped: organization has no subscription", {
          // Machine-greppable so a monitor can alert on the fail-open path.
          code: "SUBSCRIPTION_MISSING",
          organizationId,
          userId: user.id,
          featureKey,
        });
        return next();
      }

      const { value: enabled } = resolveToggle(
        {
          planFeatures: subscription.plan.features,
          overrides: subscription.featureOverrides,
        },
        featureKey,
      );

      if (!enabled) {
        throw AppError.billing.featureNotAvailable(definition.label);
      }

      next();
    },
  );
};
