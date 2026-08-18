import { DB } from "../../config/db";
import { billingRepository } from "./billing.repository";
import { resolveLimit, isAtLimit } from "../../utils/business/feature.utils";
import { AppError } from "../../utils/errors/appError";
import { logger } from "../../config/logger";
import { FEATURE_DEFINITIONS, type FeatureKey } from "../../contracts/constants";

/**
 * Enforce a numeric plan limit before creating an entity.
 *
 * Generalises what the seat check did for users: resolve the org's limit for a
 * feature key (override → plan → default), compare against current usage, and
 * refuse the create when the ceiling is reached. Call it from each entity's
 * create/import path with that entity's count function.
 *
 * Fails open when the organization has no subscription, matching every other
 * enforcement point — since org creation now always opens one, that branch is
 * unreachable except for the shrinking set of pre-existing stranded orgs.
 *
 * Super-admin is deliberately NOT exempt: a limit the platform operator can step
 * around while acting inside a tenant is not a limit. The same documented,
 * bounded count/insert race as the seat check applies.
 */
type CountFn = (organizationId: string, tx?: DB) => Promise<number>;

export const assertWithinLimit = async (
  organizationId: string,
  featureKey: FeatureKey,
  count: CountFn,
  tx?: DB,
): Promise<void> => {
  const subscription = await billingRepository.findSubscriptionByOrganizationId(
    organizationId,
    tx,
  );

  if (!subscription) {
    logger.warn("Limit check skipped: organization has no subscription", {
      organizationId,
      featureKey,
    });
    return;
  }

  const { value: limit } = resolveLimit(
    {
      planFeatures: subscription.plan.features,
      overrides: subscription.featureOverrides,
    },
    featureKey,
  );

  if (limit === null) return; // unlimited

  const used = await count(organizationId, tx);

  if (isAtLimit(limit, used)) {
    // Users keep their bespoke "disable someone to free a seat" wording; every
    // other entity uses the generic limit message.
    if (featureKey === "MAX_USERS") {
      throw AppError.billing.seatLimitReached(used, limit);
    }
    throw AppError.billing.limitReached(
      FEATURE_DEFINITIONS[featureKey].label,
      used,
      limit,
    );
  }
};

/**
 * Enforce a limit for a BATCH insert (import): refuse when the whole batch would
 * cross the ceiling, rather than checking one row at a time and letting a bulk
 * insert overshoot. Rejects the entire import if it does not fit — partial
 * imports against a hard limit are how you get an org silently one over.
 */
export const assertBatchWithinLimit = async (
  organizationId: string,
  featureKey: FeatureKey,
  count: CountFn,
  additional: number,
  tx?: DB,
): Promise<void> => {
  if (additional <= 0) return;

  const subscription = await billingRepository.findSubscriptionByOrganizationId(
    organizationId,
    tx,
  );
  if (!subscription) {
    logger.warn("Batch limit check skipped: organization has no subscription", {
      organizationId,
      featureKey,
    });
    return;
  }

  const { value: limit } = resolveLimit(
    {
      planFeatures: subscription.plan.features,
      overrides: subscription.featureOverrides,
    },
    featureKey,
  );
  if (limit === null) return; // unlimited

  const used = await count(organizationId, tx);

  if (used + additional > limit) {
    throw AppError.billing.limitReached(
      FEATURE_DEFINITIONS[featureKey].label,
      used,
      limit,
    );
  }
};
