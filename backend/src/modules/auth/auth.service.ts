import { authRepository } from "./auth.repository";
import {
  OrganizationStatus,
  Prisma,
  UserStatus,
  Role,
} from "@prisma/client";
import { hashPassword, comparePassword } from "../../utils/auth/password";
import {
  generateTokenPair,
  verifyRefreshToken,
  JWTPayload,
} from "../../utils/auth/jwt";
import crypto from "crypto";
import { AppError } from "../../utils/errors/appError";
import { prisma, DB } from "../../config/db";
import { logger } from "../../config/logger";
import { deleteStoredAsset } from "../../utils/uploads/assetFiles";
import { env } from "../../config/env";
import ms from "ms";
import {
  LoginInput,
  SignupInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "../../contracts/validation";
import {
  LoginResponse,
  SignupResponse,
  RefreshResponse,
  AuthUser,
} from "../../contracts/types";
import { safeUserSelect } from "../../utils/selectors";
import { platformSettingsRepository } from "../platformSettings/platformSettings.repository";
import { billingRepository } from "../billing/billing.repository";
import { buildInitialSubscription } from "../../utils/business/subscription.utils";
import { userService } from "../user/user.service";
import { sendPasswordResetOtpEmail } from "../../middlewares/email.config";

type OrganizationAssetInput = {
  companyLogo?: string | null;
  qrCode?: string | null;
  signature?: string | null;
};

const SUSPENDED_ORGANIZATION_LOGIN_MESSAGE =
  "Your organization account is suspended. Please contact Super Admin.";

const SIGNUP_IDENTIFIER_RETRY_LIMIT = 5;
const RESET_OTP_EXPIRY_MINUTES = 10;
const RESET_OTP_MAX_FAILED_ATTEMPTS = 5;
const PASSWORD_RESET_PUBLIC_MESSAGE =
  "If an account exists for this email, a password reset OTP has been sent.";
const PASSWORD_RESET_INVALID_MESSAGE = "Invalid or expired OTP.";

type PasswordResetRequestOutcome = {
  message: string;
  email: string;
  emailSent: boolean;
  userId?: string;
  role?: string;
  organizationId?: string | null;
  reason?: string;
};

const isOrganizationAccessBlocked = (status?: string | null) =>
  status === "SUSPENDED" || status === "INACTIVE";

const normalizeEmail = (email: string) => email.toLowerCase().trim();

const createResetOtp = () =>
  crypto.randomInt(100000, 1_000_000).toString();

const hashResetOtp = (email: string, otp: string) =>
  crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`${normalizeEmail(email)}:${otp}`)
    .digest("hex");

const isUserEligibleForPasswordReset = (user: {
  status: UserStatus | string;
  role: Role | string;
  organization?: { status: OrganizationStatus | string } | null;
}) => {
  if (user.status !== UserStatus.ACTIVE) {
    return { eligible: false, reason: "USER_INACTIVE" };
  }

  if (
    user.role !== Role.SUPER_ADMIN &&
    isOrganizationAccessBlocked(user.organization?.status)
  ) {
    return { eligible: false, reason: "ORGANIZATION_BLOCKED" };
  }

  return { eligible: true };
};

const isPasswordResetOtpUsable = (
  otpRecord: Awaited<ReturnType<typeof authRepository.findPasswordResetOtp>>,
) => {
  if (!otpRecord) return false;
  if (otpRecord.usedAt || otpRecord.revokedAt) return false;
  if (otpRecord.expiresAt <= new Date()) return false;
  if (otpRecord.failedAttempts >= RESET_OTP_MAX_FAILED_ATTEMPTS) return false;

  return isUserEligibleForPasswordReset(otpRecord.user).eligible;
};

const randomIdentifierSuffix = (length: number) =>
  crypto
    .randomBytes(length)
    .toString("hex")
    .toUpperCase()
    .slice(0, length);

const slugifyCompanyName = (companyName: string) => {
  const slug = companyName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "organization";
};

const prefixBaseFromCompanyName = (companyName: string) => {
  const words = companyName.match(/[A-Za-z0-9]+/g) ?? [];
  const acronym =
    words.length > 1
      ? words.map((word) => word[0]).join("")
      : words.join("");
  const sanitized = acronym.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const fallback = companyName.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const base = (sanitized || fallback || "ORG").slice(0, 4);

  return base.length >= 2 ? base : `${base}O`.slice(0, 2);
};

const buildSignupIdentifiers = (companyName: string, attempt: number) => {
  const slugBase =
    slugifyCompanyName(companyName).slice(0, 60).replace(/-+$/g, "") ||
    "organization";
  const prefixBase = prefixBaseFromCompanyName(companyName);

  if (attempt === 0) {
    return {
      slug: slugBase,
      prefix: prefixBase.slice(0, 10),
    };
  }

  const slugSuffix = randomIdentifierSuffix(4).toLowerCase();
  const prefixSuffix = randomIdentifierSuffix(4);
  const slugStem = slugBase.slice(0, Math.max(2, 60 - slugSuffix.length - 1));
  const prefixStem = prefixBase.slice(
    0,
    Math.max(2, 10 - prefixSuffix.length),
  );

  return {
    slug: `${slugStem}-${slugSuffix}`,
    prefix: `${prefixStem}${prefixSuffix}`.slice(0, 10),
  };
};

const getUniqueErrorTargets = (
  error: Prisma.PrismaClientKnownRequestError,
) => {
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return [];
};

const uniqueErrorMentions = (
  error: Prisma.PrismaClientKnownRequestError,
  fields: string[],
) => {
  const haystack = [...getUniqueErrorTargets(error), error.message]
    .join(" ")
    .toLowerCase();

  return fields.some((field) => haystack.includes(field.toLowerCase()));
};

const isUniqueConstraintError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

const resolveSelfServiceSignupPlan = async () => {
  const settings = await platformSettingsRepository.get();

  if (!settings.defaultPlanId) {
    throw AppError.validation.badRequest(
      "Self-service signup is not configured. Please contact support.",
    );
  }

  const plan = await billingRepository.findPlanById(settings.defaultPlanId);
  if (!plan) {
    throw AppError.validation.badRequest(
      "Self-service signup is not configured. Please contact support.",
    );
  }

  if (!plan.isActive) {
    throw AppError.validation.badRequest(
      "Self-service signup is temporarily unavailable. Please contact support.",
    );
  }

  if (!plan.isPublic) {
    throw AppError.validation.badRequest(
      "Self-service signup is not available for the configured plan. Please contact support.",
    );
  }

  return plan;
};

// private helper
async function getOrganizationPrefix(
  organizationId?: string,
  tx?: DB,
): Promise<string | undefined> {
  if (!organizationId) return undefined;

  const db = tx || prisma;
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { prefix: true },
  });

  return org?.prefix;
}

// private helper
async function generateTokens(
  userId: string,
  email: string,
  role: string,
  organizationId?: string,
  tx?: DB,
) {
  const organizationPrefix = await getOrganizationPrefix(organizationId, tx);
  const payload: JWTPayload = {
    id: userId,
    email,
    role,
    organizationId,
    organizationPrefix,
  };
  return generateTokenPair(payload);
}

// private helper for explicit mapping
export function mapUserToContract(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    mobile: user.mobile,
    profileImage: user.profileImage,
    role: user.role,
    status: user.status,
    employeeId: user.employeeId,
    designation: user.designation,
    joiningDate:
      user.joiningDate instanceof Date
        ? user.joiningDate.toISOString()
        : user.joiningDate,
    organizationId: user.organizationId,
    managerId: user.managerId,
    organization: user.organization
      ? {
          name: user.organization.name,
          slug: user.organization.slug,
          prefix: user.organization.prefix,
          status: user.organization.status,
          address: user.organization.address,
          gstin: user.organization.gstin,
          mobile: user.organization.mobile,
          email: user.organization.email,
          companyLogo: user.organization.companyLogo,
          qrCode: user.organization.qrCode,
          signature: user.organization.signature,
        }
      : null,
    lastLoginAt:
      user.lastLoginAt instanceof Date
        ? user.lastLoginAt.toISOString()
        : user.lastLoginAt,
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : user.createdAt,
    updatedAt:
      user.updatedAt instanceof Date
        ? user.updatedAt.toISOString()
        : user.updatedAt,
  };
}

export const authService = {
  async signup(
    input: SignupInput,
    ip?: string,
    userAgent?: string,
  ): Promise<SignupResponse & { refreshToken: string }> {
    const email = input.email.toLowerCase().trim();
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
      throw AppError.authentication.emailExists();
    }

    const plan = await resolveSelfServiceSignupPlan();
    const hashedPassword = await hashPassword(input.password);

    for (let attempt = 0; attempt < SIGNUP_IDENTIFIER_RETRY_LIMIT; attempt++) {
      const { slug, prefix } = buildSignupIdentifiers(
        input.companyName,
        attempt,
      );

      try {
        return await prisma.$transaction(
          async (tx) => {
            const now = new Date();
            const organization = await tx.organization.create({
              data: {
                name: input.companyName,
                slug,
                prefix,
                status: OrganizationStatus.ACTIVE,
                authorizedPerson: `${input.firstName} ${input.lastName}`.trim(),
                email,
              },
              select: {
                id: true,
                name: true,
                slug: true,
                prefix: true,
                status: true,
              },
            });

            await tx.leadSequence.create({
              data: {
                organizationId: organization.id,
                lastSequence: 0,
              },
            });
            await tx.userSequence.create({
              data: {
                organizationId: organization.id,
                lastSequence: 0,
              },
            });
            await tx.prospectSequence.create({
              data: {
                organizationId: organization.id,
                lastSequence: 0,
              },
            });
            await tx.quotationSequence.create({
              data: {
                organizationId: organization.id,
                year: now.getUTCFullYear(),
                lastSequence: 0,
              },
            });

            const employeeId = await userService.generateEmployeeId(
              organization.id,
              tx,
            );

            const adminUser = await tx.user.create({
              data: {
                email,
                password: hashedPassword,
                firstName: input.firstName,
                lastName: input.lastName,
                role: Role.ADMIN,
                status: UserStatus.ACTIVE,
                organizationId: organization.id,
                employeeId,
                lastLoginAt: now,
                // Keep the first issued access token valid: jwt iat is second
                // precision while Date includes milliseconds.
                passwordChangedAt: new Date(now.getTime() - 1000),
              },
              select: safeUserSelect,
            });

            const initial = buildInitialSubscription(plan, now);
            await billingRepository.createSubscription(
              {
                organizationId: organization.id,
                planId: plan.id,
                status: initial.status,
                trialEndsAt: initial.trialEndsAt,
                currentPeriodStart: initial.currentPeriodStart,
                currentPeriodEnd: initial.currentPeriodEnd,
              },
              tx,
            );

            const tokens = await generateTokens(
              adminUser.id,
              adminUser.email,
              adminUser.role as string,
              adminUser.organizationId || undefined,
              tx,
            );

            const hashedToken = crypto
              .createHash("sha256")
              .update(tokens.refreshToken)
              .digest("hex");

            const refreshTokenExpiryMs = ms(
              env.JWT_REFRESH_EXPIRY as Parameters<typeof ms>[0],
            );
            const expiresAt = new Date(Date.now() + refreshTokenExpiryMs);

            await authRepository.createRefreshToken(
              adminUser.id,
              hashedToken,
              expiresAt,
              ip,
              userAgent,
              tx,
            );

            return {
              user: mapUserToContract(adminUser),
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            };
          },
          { timeout: 20000 },
        );
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        if (uniqueErrorMentions(error, ["email"])) {
          throw AppError.authentication.emailExists();
        }

        if (uniqueErrorMentions(error, ["slug", "prefix"])) {
          if (attempt < SIGNUP_IDENTIFIER_RETRY_LIMIT - 1) {
            logger.warn("Self-service signup identifier collision; retrying", {
              attempt: attempt + 1,
              companyName: input.companyName,
            });
            continue;
          }

          throw AppError.resource.conflict(
            "Could not create a unique organization identifier. Please try again.",
          );
        }

        throw error;
      }
    }

    throw AppError.resource.conflict(
      "Could not create a unique organization identifier. Please try again.",
    );
  },

  async login(
    credentials: LoginInput,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponse & { refreshToken: string }> {
    const email = credentials.email.toLowerCase().trim();
    // Get user with password for authentication
    const user = await authRepository.findUserByEmailWithPassword(email);

    if (!user) {
      logger.warn("Failed login attempt", { ip });
      throw AppError.authentication.invalidCredentials();
    }

    if (user.status === UserStatus.INACTIVE) {
      logger.warn("Failed login attempt - inactive user", {
        ip,
        email: user.email,
      });
      throw AppError.authentication.userDisabled();
    }

    const isMatch = await comparePassword(credentials.password, user.password);
    if (!isMatch) {
      logger.warn("Failed login attempt", { ip });
      throw AppError.authentication.invalidCredentials();
    }

    if (
      user.role !== Role.SUPER_ADMIN &&
      isOrganizationAccessBlocked(user.organization?.status)
    ) {
      logger.warn("Failed login attempt - suspended organization", {
        ip,
        email: user.email,
        organizationId: user.organizationId,
        organizationStatus: user.organization?.status,
      });
      throw AppError.authorization.suspended(
        SUSPENDED_ORGANIZATION_LOGIN_MESSAGE,
      );
    }

    // Use transaction for login flow
    return await prisma.$transaction(async (tx) => {
      // Limit refresh tokens to 5 per user - keep most recent ones
      const existingTokens = await authRepository.getActiveRefreshTokens(
        user.id,
        tx,
      );

      if (existingTokens.length >= 5) {
        // Efficiently keep only the top 4 recent tokens (since we're adding 1)
        const tokensToKeep = existingTokens.slice(0, 4).map((t) => t.id);
        await authRepository.rotateRefreshTokens(user.id, tokensToKeep, tx);
      }

      const updatedUser = await authRepository.updateUserLastLogin(user.id, tx);

      const tokens = await generateTokens(
        updatedUser.id,
        updatedUser.email,
        updatedUser.role as string,
        updatedUser.organizationId || undefined,
        tx,
      );

      // Persist refresh token (hashed)
      const hashedToken = crypto
        .createHash("sha256")
        .update(tokens.refreshToken)
        .digest("hex");

      const refreshTokenExpiryMs = ms(
        env.JWT_REFRESH_EXPIRY as Parameters<typeof ms>[0],
      );
      const expiresAt = new Date(Date.now() + refreshTokenExpiryMs);

      await authRepository.createRefreshToken(
        updatedUser.id,
        hashedToken,
        expiresAt,
        ip,
        userAgent,
        tx as any,
      );

      return {
        user: mapUserToContract(updatedUser),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  },

  async refresh(
    incomingRefreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<RefreshResponse & { refreshToken: string }> {
    const payload = verifyRefreshToken(incomingRefreshToken);

    const hashedToken = crypto
      .createHash("sha256")
      .update(incomingRefreshToken)
      .digest("hex");

    return await prisma.$transaction(async (tx) => {
      // 1. Check token exists
      const storedToken = await authRepository.findRefreshToken(
        hashedToken,
        tx,
      );

      if (!storedToken) {
        logger.warn("Potential refresh token reuse or invalid session", {
          ip,
          userAgent,
          userId: payload.id,
        });
        throw AppError.authentication.tokenInvalid(
          "Session expired or invalid",
        );
      }

      // 2. Handle grace period for rotated tokens (Multi-tab support)
      if (storedToken.replacedAt) {
        const gracePeriodMs = 30000; // 30 seconds
        const isWithinGrace =
          new Date().getTime() - storedToken.replacedAt.getTime() <
          gracePeriodMs;

        if (!isWithinGrace) {
          throw AppError.authentication.tokenExpired("Session expired");
        }

        if (storedToken.isUsedAfterRotation) {
          // 🚨 REPLAY ATTACK DETECTED
          logger.error(
            "Token reuse detected! Revoking all sessions for user.",
            {
              userId: storedToken.userId,
              ip,
              userAgent,
            },
          );
          // Revoke all sessions for this user for safety
          await authRepository.deleteAllUserRefreshTokens(
            storedToken.userId,
            tx,
          );
          throw AppError.authentication.tokenInvalid(
            "Security alert: Token reuse detected. All sessions revoked.",
          );
        }

        // Mark as used within grace period to prevent further reuse if attacker gets this old token
        await authRepository.markAsUsedAfterRotation(hashedToken, tx);
      }

      // 3. Expiry check (for active tokens)
      if (!storedToken.replacedAt && storedToken.expiresAt < new Date()) {
        await authRepository.deleteRefreshToken(hashedToken, tx);
        throw AppError.authentication.tokenExpired("Refresh token expired");
      }

      // 4. User check
      if (storedToken.user.status === UserStatus.INACTIVE) {
        throw AppError.authentication.userDisabled();
      }

      if (
        storedToken.user.role !== Role.SUPER_ADMIN &&
        isOrganizationAccessBlocked(storedToken.user.organization?.status)
      ) {
        await authRepository.deleteAllUserRefreshTokens(storedToken.userId, tx);
        throw AppError.authorization.suspended(
          SUSPENDED_ORGANIZATION_LOGIN_MESSAGE,
        );
      }

      // 5. Generate new tokens
      const newPayload: JWTPayload = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        organizationId: payload.organizationId,
        organizationPrefix: payload.organizationPrefix,
        nonce: crypto.randomUUID(),
      };

      const tokens = await generateTokenPair(newPayload);

      // 6. Store new refresh token
      const newHashedToken = crypto
        .createHash("sha256")
        .update(tokens.refreshToken)
        .digest("hex");

      const refreshTokenExpiryMs = ms(
        env.JWT_REFRESH_EXPIRY as Parameters<typeof ms>[0],
      );
      const expiresAt = new Date(Date.now() + refreshTokenExpiryMs);

      await authRepository.createRefreshToken(
        payload.id,
        newHashedToken,
        expiresAt,
        ip,
        userAgent,
        tx as any,
      );

      // 7. Mark current token as replaced instead of deleting (IMPORTANT for multi-tab)
      if (!storedToken.replacedAt) {
        await authRepository.markTokenAsReplaced(hashedToken, tx);
      }

      return tokens;
    });
  },

  async logout(incomingRefreshToken?: string) {
    if (incomingRefreshToken) {
      const hashedToken = crypto
        .createHash("sha256")
        .update(incomingRefreshToken)
        .digest("hex");
      await authRepository.deleteRefreshToken(hashedToken);
    }
  },

  async generatePasswordResetOtp(
    input: ForgotPasswordInput,
    ip?: string,
    userAgent?: string,
  ): Promise<PasswordResetRequestOutcome> {
    const email = normalizeEmail(input.email);
    const genericOutcome = {
      message: PASSWORD_RESET_PUBLIC_MESSAGE,
      email,
      emailSent: false,
    };

    const user = await authRepository.findUserForPasswordReset(email);

    if (!user) {
      logger.info("Password reset OTP requested for unknown email", { ip });
      return { ...genericOutcome, reason: "USER_NOT_FOUND" };
    }

    const eligibility = isUserEligibleForPasswordReset(user);
    if (!eligibility.eligible) {
      logger.warn("Password reset OTP skipped for ineligible user", {
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
        reason: eligibility.reason,
        ip,
      });

      return {
        ...genericOutcome,
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
        reason: eligibility.reason,
      };
    }

    const otp = createResetOtp();
    const otpHash = hashResetOtp(email, otp);
    const expiresAt = new Date(
      Date.now() + RESET_OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    const resetOtp = await prisma.$transaction(async (tx) => {
      await authRepository.revokeUnusedPasswordResetOtps(
        user.id,
        undefined,
        tx,
      );
      return authRepository.createPasswordResetOtp(
        {
          userId: user.id,
          otpHash,
          expiresAt,
          requestedIp: ip,
          requestedUserAgent: userAgent,
        },
        tx,
      );
    });

    try {
      await sendPasswordResetOtpEmail({
        to: user.email,
        otp,
      });

      logger.info("Password reset OTP email sent", {
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
        ip,
      });

      return {
        message: PASSWORD_RESET_PUBLIC_MESSAGE,
        email,
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
        emailSent: true,
      };
    } catch (error) {
      await authRepository.revokePasswordResetOtp(resetOtp.id);

      logger.error("Password reset OTP email delivery failed", {
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        message: PASSWORD_RESET_PUBLIC_MESSAGE,
        email,
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
        emailSent: false,
        reason: "EMAIL_DELIVERY_FAILED",
      };
    }
  },

  async resetPasswordWithOtp(
    input: ResetPasswordInput,
    ip?: string,
    userAgent?: string,
  ) {
    const email = normalizeEmail(input.email);
    const user = await authRepository.findUserForPasswordReset(email);

    if (!user || !isUserEligibleForPasswordReset(user).eligible) {
      logger.warn("Password reset rejected for invalid email or user state", {
        ip,
      });
      throw AppError.validation.badRequest(PASSWORD_RESET_INVALID_MESSAGE);
    }

    const otpHash = hashResetOtp(email, input.otp);
    const otpRecord = await authRepository.findPasswordResetOtp(otpHash);

    if (!otpRecord || otpRecord.userId !== user.id) {
      const pendingOtp = await authRepository.findLatestPendingPasswordResetOtp(
        user.id,
      );
      if (pendingOtp) {
        const updatedOtp =
          await authRepository.incrementPasswordResetOtpFailures(pendingOtp.id);
        if (updatedOtp.failedAttempts >= RESET_OTP_MAX_FAILED_ATTEMPTS) {
          await authRepository.revokePasswordResetOtp(updatedOtp.id);
        }
      }

      logger.warn("Password reset rejected for invalid OTP", {
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
        ip,
      });
      throw AppError.validation.badRequest(PASSWORD_RESET_INVALID_MESSAGE);
    }

    if (!isPasswordResetOtpUsable(otpRecord)) {
      if (!otpRecord.usedAt && !otpRecord.revokedAt) {
        const updatedOtp =
          await authRepository.incrementPasswordResetOtpFailures(otpRecord.id);
        if (updatedOtp.failedAttempts >= RESET_OTP_MAX_FAILED_ATTEMPTS) {
          await authRepository.revokePasswordResetOtp(updatedOtp.id);
        }
      }

      logger.warn("Password reset rejected for unusable OTP", {
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
        ip,
      });
      throw AppError.validation.badRequest(PASSWORD_RESET_INVALID_MESSAGE);
    }

    const hashedPassword = await hashPassword(input.newPassword);

    const result = await prisma.$transaction(async (tx) => {
      const currentOtp = await authRepository.findPasswordResetOtp(otpHash, tx);

      if (!currentOtp || !isPasswordResetOtpUsable(currentOtp)) {
        throw AppError.validation.badRequest(PASSWORD_RESET_INVALID_MESSAGE);
      }

      const consumed = await authRepository.markPasswordResetOtpUsed(
        currentOtp.id,
        ip,
        userAgent,
        tx,
      );

      if (consumed.count !== 1) {
        throw AppError.validation.badRequest(PASSWORD_RESET_INVALID_MESSAGE);
      }

      const updatedUser = await authRepository.updateUserPassword(
        currentOtp.userId,
        hashedPassword,
        tx,
      );

      await authRepository.revokeUnusedPasswordResetOtps(
        currentOtp.userId,
        currentOtp.id,
        tx,
      );
      await authRepository.deleteAllUserRefreshTokens(currentOtp.userId, tx);

      return {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
      };
    });

    logger.info("Password reset completed and sessions invalidated", {
      userId: result.userId,
      role: result.role,
      organizationId: result.organizationId,
      ip,
    });

    return result;
  },

  async updateProfile(
    userId: string,
    data: UpdateProfileInput,
    organizationAssets: OrganizationAssetInput = {},
  ) {
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined),
    );
    const hasUserUpdates = Object.keys(updateData).length > 0;
    const assetUpdates = Object.fromEntries(
      Object.entries(organizationAssets).filter(
        ([, value]) => value !== undefined,
      ),
    );
    const hasAssetUpdates = Object.keys(assetUpdates).length > 0;

    if (!hasUserUpdates && !hasAssetUpdates) {
      throw AppError.validation.badRequest("No fields to update");
    }

    /**
     * Paths this update supersedes. Collected inside the transaction but
     * deleted only after it commits — deleting first would destroy the live
     * asset if the write then rolled back.
     */
    const replacedAssetPaths: (string | null)[] = [];

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (hasAssetUpdates) {
        const user = await authRepository.findUserById(userId, tx);
        if (!user?.organizationId) {
          throw AppError.validation.badRequest(
            "Organization assets can only be uploaded by users assigned to an organization",
          );
        }

        const organization = await tx.organization.findUnique({
          where: { id: user.organizationId },
          select: { companyLogo: true, qrCode: true, signature: true },
        });

        for (const [field, nextValue] of Object.entries(assetUpdates)) {
          const previous =
            organization?.[field as keyof typeof organization] ?? null;
          if (previous && previous !== nextValue) {
            replacedAssetPaths.push(previous);
          }
        }

        await tx.organization.update({
          where: { id: user.organizationId },
          data: assetUpdates,
        });
      }

      if (hasUserUpdates) {
        if (updateData.profileImage) {
          const current = await authRepository.findUserById(userId, tx);
          if (
            current?.profileImage &&
            current.profileImage !== updateData.profileImage
          ) {
            replacedAssetPaths.push(current.profileImage);
          }
        }

        return authRepository.updateUserProfile(userId, updateData, tx);
      }

      const user = await authRepository.findUserById(userId, tx);
      if (!user) {
        throw AppError.authentication.userNotFound();
      }
      return user;
    });

    await Promise.all(
      replacedAssetPaths.map((assetPath) =>
        deleteStoredAsset(assetPath, "replaced by profile update"),
      ),
    );

    logger.info("Profile updated", {
      userId,
      changes: [...Object.keys(updateData), ...Object.keys(assetUpdates)],
    });
    return mapUserToContract(updatedUser);
  },

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await authRepository.findUserByIdWithPassword(userId);
    if (!user) throw AppError.authentication.userNotFound();

    const isCurrentPasswordValid = await comparePassword(
      data.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw AppError.authentication.invalidCredentials(
        "Current password is incorrect",
      );
    }

    const hashedPassword = await hashPassword(data.newPassword);

    await prisma.$transaction(async (tx) => {
      await authRepository.updateUserPassword(userId, hashedPassword, tx);
      await authRepository.deleteAllUserRefreshTokens(userId, tx);
    });

    logger.info("Password changed and all sessions invalidated", { userId });
  },
};
