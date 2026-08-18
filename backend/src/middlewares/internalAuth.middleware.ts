import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env";
import { AppError } from "../utils/errors/appError";
import { logger } from "../config/logger";

/**
 * Shared-secret auth for machine-to-machine internal endpoints.
 *
 * Used by the scheduled-jobs route, which the platform scheduler calls on a
 * timer. There is no user, no session and no CSRF token involved — the secret
 * is the whole of the authentication.
 *
 * Three deliberate choices:
 *
 * 1. FAILS CLOSED when INTERNAL_JOB_SECRET is unset. An open job runner that
 *    anyone can trigger is strictly worse than no job runner.
 * 2. Uses timingSafeEqual. A plain === leaks the secret one byte at a time to
 *    anyone who can measure response times, and this endpoint is unauthenticated
 *    by design so it is exactly the sort of thing that gets probed.
 * 3. Never echoes the supplied value, not even at debug level.
 */
export const requireInternalSecret = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const expected = env.INTERNAL_JOB_SECRET;

  if (!expected) {
    logger.error(
      "Internal endpoint called but INTERNAL_JOB_SECRET is not configured",
      { path: req.path, ip: req.ip },
    );
    return next(
      AppError.authorization.forbidden("Internal endpoints are not enabled"),
    );
  }

  const provided = req.get("x-internal-secret");

  if (!provided) {
    logger.warn("Internal endpoint called without a secret", {
      path: req.path,
      ip: req.ip,
    });
    return next(AppError.authentication.unauthorized("Missing internal secret"));
  }

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // secret's length — compare lengths first and fall through to the same error.
  const matches =
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!matches) {
    logger.warn("Internal endpoint called with an invalid secret", {
      path: req.path,
      ip: req.ip,
    });
    return next(AppError.authentication.unauthorized("Invalid internal secret"));
  }

  next();
};
