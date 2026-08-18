import { verifyAccessToken } from "../utils/auth/jwt";
import { UserStatus } from "@prisma/client";
import { authRepository } from "../modules/auth/auth.repository";
import { AppError } from "../utils/errors/appError";
import { asyncHandler } from "../utils/middleware/asyncHandler";
import jwt from "jsonwebtoken";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  let token: string | undefined;

  // 1. Extract Authorization header (case-safe)
  const authHeader =
    req.headers.authorization ||
    (req.headers.Authorization as string | undefined);

  // 2. Validate Bearer format
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1]?.trim();
  }

  if (!token) {
    throw AppError.authentication.tokenInvalid(
      "Missing or malformed Authorization header",
    );
  }

  // 3. Verify token
  let decoded: { id: string; iat?: number };

  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.authentication.tokenExpired(
        "Your session has expired. Please login again.",
      );
    }
    const message = err instanceof Error ? err.message : "Invalid or expired token";
    throw AppError.authentication.tokenInvalid(message);
  }

  if (!decoded?.id) {
    throw AppError.authentication.tokenInvalid("Invalid token payload");
  }

  // 4. Fetch user (secure but DB hit)
  const user = await authRepository.findUserById(decoded.id);

  if (!user) {
    throw AppError.resource.notFound("User");
  }

  if (user.status === UserStatus.INACTIVE) {
    throw AppError.authentication.userDisabled();
  }

  // 6. Organization Status check (CRITICAL)
  if (user.organization && user.organization.status !== "ACTIVE") {
    throw AppError.authorization.suspended();
  }

  // 5. Token invalidation if password changed
  if (user.passwordChangedAt && decoded.iat) {
    const tokenIssuedAt = decoded.iat * 1000;

    if (user.passwordChangedAt.getTime() > tokenIssuedAt) {
      throw AppError.authentication.tokenInvalid(
        "Token expired due to password change",
      );
    }
  }

  // 6. Attach user to request
  req.user = user;

  next();
});
