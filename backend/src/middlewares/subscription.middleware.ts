import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { billingRepository } from "../modules/billing/billing.repository";
import { resolveSubscriptionState } from "../utils/business/subscription.utils";
import { AppError } from "../utils/errors/appError";
import { asyncHandler } from "../utils/middleware/asyncHandler";
import { logger } from "../config/logger";

/**
 * Subscription enforcement.
 *
 * Blocks WRITES for organizations whose subscription has lapsed past its grace
 * period. Reads are always allowed, and that asymmetry is the whole design:
 *
 *   A tenant who cannot see their own data cannot export it, cannot look up the
 *   invoice, and cannot make an informed decision to renew. Hard-locking a
 *   lapsed customer converts a renewal conversation into a chargeback.
 *
 * Mount AFTER requireAuth on tenant data modules. Deliberately NOT mounted on
 * auth, billing, dashboard, reports, audit or announcements — an admin must be
 * able to log in, read their numbers, and reach the page where they can pay.
 * That exclusion is expressed by where this is mounted in app.ts, not by
 * path-matching in here, so adding a route never silently changes it.
 */

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export const enforceSubscription = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (SAFE_METHODS.includes(req.method)) {
      return next();
    }

    const user = req.user;
    if (!user) {
      // requireAuth runs first and would already have rejected this. Defer
      // rather than invent an error: it is not this middleware's decision.
      return next();
    }

    /*
     * Super-admin is exempt.
     *
     * Unlike the seat limit, this exemption is correct: the platform operator
     * fixing or migrating a lapsed tenant is exactly the person who must still
     * be able to write. Their own actions are recorded in the audit trail.
     */
    if (user.role === Role.SUPER_ADMIN) {
      return next();
    }

    const organizationId = user.organizationId;
    if (!organizationId) {
      return next();
    }

    const subscription =
      await billingRepository.findSubscriptionByOrganizationId(organizationId);

    // Fails open, matching resolveSubscriptionState and assertSeatAvailable.
    if (!subscription) {
      logger.warn("Subscription check skipped: organization has no subscription", {
        // Machine-greppable so a monitor can alert on any org slipping through the
        // fail-open path — backfillSubscriptions.ts should keep this at zero.
        code: "SUBSCRIPTION_MISSING",
        organizationId,
        userId: user.id,
        path: req.path,
      });
      return next();
    }

    const state = resolveSubscriptionState(subscription);

    if (state.isReadOnly) {
      logger.info("Write blocked: subscription lapsed", {
        organizationId,
        userId: user.id,
        method: req.method,
        path: req.path,
        effectiveStatus: state.effectiveStatus,
      });

      throw AppError.billing.subscriptionRequired(
        state.reason ??
          "Your subscription has lapsed. Renew to continue making changes.",
      );
    }

    next();
  },
);
