import { Request, Response } from "express";
import { authService } from "./auth.service";
import { authRepository } from "./auth.repository";
import { ApiResponse } from "../../utils/response/response";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { AppError } from "../../utils/errors/appError";
import { COOKIE_CONFIG } from "../../constants";
import { logger } from "../../config/logger";
import { 
  LoginSchema, 
  SignupSchema,
  UpdateProfileSchema, 
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "../../contracts/validation";
import { mapUserToContract } from "./auth.service";
import { extractIp, getRefreshToken } from "../../utils/request";
import { recordAudit } from "../../utils/audit/recordAudit";
import { toPublicUploadPath } from "../../utils/uploads/assetFiles";

// private helpers
const setCookies = (
  res: Response,
  refreshToken: string,
) => {
  res.cookie("refresh_token", refreshToken, {
    httpOnly: COOKIE_CONFIG.HTTP_ONLY,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE,
    path: "/api/v1/auth", // Restricted to auth routes only
  });
};

const clearCookies = (res: Response) => {
  res.clearCookie("refresh_token", {
    httpOnly: COOKIE_CONFIG.HTTP_ONLY,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/v1/auth",
  });
};

const ORGANIZATION_ASSET_FIELDS = [
  "companyLogo",
  "qrCode",
  "signature",
] as const;

type OrganizationAssetField = (typeof ORGANIZATION_ASSET_FIELDS)[number];

type AuthProfileUploadFiles = Partial<
  Record<"profileImage" | OrganizationAssetField, Express.Multer.File[]>
>;

const getUploadedProfileImage = (req: Request) => {
  const files = req.files as AuthProfileUploadFiles | undefined;
  const file = files?.profileImage?.[0];
  return file ? toPublicUploadPath(file) : undefined;
};

const getUploadedOrganizationAssets = (req: Request) => {
  const files = req.files as AuthProfileUploadFiles | undefined;

  // The URL comes from where multer actually wrote the file, so this cannot
  // drift from the folder layout configured in multerConfig.
  return ORGANIZATION_ASSET_FIELDS.reduce(
    (assets, fieldName) => {
      const file = files?.[fieldName]?.[0];
      if (file) {
        assets[fieldName] = toPublicUploadPath(file);
      }
      return assets;
    },
    {} as Partial<Record<OrganizationAssetField, string>>,
  );
};

export const authController = {
  signup: asyncHandler(async (req: Request, res: Response) => {
    const data = SignupSchema.parse(req.body);

    const ip = extractIp(req);
    const userAgent = req.get("user-agent");

    const { user, accessToken, refreshToken } = await authService.signup(
      data,
      ip,
      userAgent,
    );
    setCookies(res, refreshToken);

    logger.info("Self-service signup completed", {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      ip,
      userAgent,
    });

    await recordAudit(req, {
      action: "SELF_SERVICE_SIGNUP",
      entityType: "AUTH",
      entityId: user.id,
      actor: { id: user.id, email: user.email, role: user.role },
      organizationId: user.organizationId ?? null,
      after: {
        userId: user.id,
        organizationId: user.organizationId ?? null,
        organizationName: user.organization?.name ?? null,
        organizationSlug: user.organization?.slug ?? null,
        role: user.role,
      },
    });

    return ApiResponse.ok(res, { user, accessToken }, "Signup successful");
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const data = LoginSchema.parse(req.body);
    
    const ip = extractIp(req);
    const userAgent = req.get("user-agent");
 
    let result: Awaited<ReturnType<typeof authService.login>>;
    try {
      result = await authService.login(data, ip, userAgent);
    } catch (error) {
      // Record the attempt, then rethrow so the original error still reaches the
      // client unchanged. Only the attempted email is captured — never the
      // submitted password, and never the parsed login body.
      //
      // When the email belongs to a real user, stamp the row with their org so
      // that org's admin can see the failed attempt (a null-org row is
      // super-admin-only). When it does not, leave everything null — surfacing
      // "this email exists" to an org admin would leak account existence.
      const knownUser = await authRepository
        .findUserByEmail(data.email.toLowerCase().trim())
        .catch(() => null);

      await recordAudit(req, {
        action: "LOGIN_FAILED",
        entityType: "AUTH",
        entityId: knownUser?.id ?? undefined,
        actor: knownUser
          ? { id: null, email: data.email, role: knownUser.role }
          : { id: null, email: data.email, role: "UNKNOWN" },
        organizationId: knownUser?.organizationId ?? null,
        after: {
          reason: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }

    const { user, accessToken, refreshToken } = result;
    setCookies(res, refreshToken);

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    await recordAudit(req, {
      action: "LOGIN_SUCCEEDED",
      entityType: "AUTH",
      entityId: user.id,
      actor: { id: user.id, email: user.email, role: user.role },
      organizationId: user.organizationId ?? null,
    });

    return ApiResponse.ok(res, { user, accessToken }, "Login successful");
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const incomingRefreshToken = getRefreshToken(req);
    if (!incomingRefreshToken) {
      logger.warn("Token refresh attempt without refresh token", {
        ip: extractIp(req),
      });
      throw AppError.authentication.tokenInvalid("No refresh token provided");
    }

    const ip = extractIp(req);
    const userAgent = req.get("user-agent");
 
    const { accessToken, refreshToken } = await authService.refresh(
      incomingRefreshToken,
      ip,
      userAgent,
    );
    setCookies(res, refreshToken);
    
    logger.debug("Token refreshed successfully", {
      ip: req.ip,
    });
    
    return ApiResponse.ok(res, { accessToken }, "Token refreshed successfully");
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const incomingRefreshToken = getRefreshToken(req);
    await authService.logout(incomingRefreshToken);
    clearCookies(res);
    
    logger.info("User logged out", {
      ip: req.ip,
    });
    
    return ApiResponse.ok(res, null, "Logout successful");
  }),

  generatePasswordResetOtp: asyncHandler(async (req: Request, res: Response) => {
    const data = ForgotPasswordSchema.parse(req.body);
    const ip = extractIp(req);
    const userAgent = req.get("user-agent");

    const result = await authService.generatePasswordResetOtp(
      data,
      ip,
      userAgent,
    );

    await recordAudit(req, {
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "AUTH",
      entityId: result.userId ?? undefined,
      actor: {
        id: result.userId ?? null,
        email: result.email,
        role: result.role ?? "UNKNOWN",
      },
      organizationId: result.organizationId ?? null,
      after: {
        emailSent: result.emailSent,
        reason: result.reason ?? null,
      },
    });

    if (result.emailSent) {
      await recordAudit(req, {
        action: "PASSWORD_RESET_EMAIL_SENT",
        entityType: "AUTH",
        entityId: result.userId,
        actor: {
          id: result.userId ?? null,
          email: result.email,
          role: result.role ?? "UNKNOWN",
        },
        organizationId: result.organizationId ?? null,
      });
    }

    if (result.reason === "EMAIL_DELIVERY_FAILED") {
      throw AppError.system.unavailable(
        "Could not send password reset OTP. Please try again later.",
      );
    }

    return ApiResponse.ok(res, { message: result.message }, result.message);
  }),

  resetPasswordWithOtp: asyncHandler(async (req: Request, res: Response) => {
    const data = ResetPasswordSchema.parse(req.body);
    const ip = extractIp(req);
    const userAgent = req.get("user-agent");

    try {
      const result = await authService.resetPasswordWithOtp(data, ip, userAgent);
      clearCookies(res);

      await recordAudit(req, {
        action: "PASSWORD_RESET_SUCCEEDED",
        entityType: "USER",
        entityId: result.userId,
        actor: {
          id: result.userId,
          email: result.email,
          role: result.role,
        },
        organizationId: result.organizationId ?? null,
        after: {
          sessionsInvalidated: true,
        },
      });

      return ApiResponse.ok(
        res,
        { message: "Password reset successfully." },
        "Password reset successfully.",
      );
    } catch (error) {
      await recordAudit(req, {
        action: "PASSWORD_RESET_FAILED",
        entityType: "AUTH",
        actor: {
          id: null,
          email: data.email.toLowerCase().trim(),
          role: "UNKNOWN",
        },
        organizationId: null,
        after: {
          reason: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  }),

  getMe: asyncHandler(async (req: Request, res: Response) => {
    // `req.user` should be populated by `requireAuth` middleware
    if (!req.user) {
      return ApiResponse.ok(res, { user: null }, "No user logged in");
    }
    return ApiResponse.ok(res, { user: mapUserToContract(req.user) }, "User fetched successfully");
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.authentication.required();
    const data = UpdateProfileSchema.parse(req.body);
    const profileImage = getUploadedProfileImage(req);
    const uploadedAssets = getUploadedOrganizationAssets(req);
    const updatedUser = await authService.updateProfile(
      req.user.id,
      profileImage ? { ...data, profileImage } : data,
      uploadedAssets,
    );

    /**
     * Record WHICH fields the user touched, never their values — a profile edit
     * can carry personal data we do not want copied into the trail.
     *
     * Uploads are named too. They arrive on req.files rather than in the parsed
     * body, so a request that only replaced an image used to audit as
     * `fields: []` — an organization signature could be swapped with nothing in
     * the trail to show it. File names and paths stay out; only the field.
     */
    const touchedFields = [
      ...Object.keys(data),
      ...(profileImage ? ["profileImage"] : []),
      ...Object.keys(uploadedAssets),
    ];

    await recordAudit(req, {
      action: "USER_PROFILE_UPDATED",
      entityType: "USER",
      entityId: req.user.id,
      organizationId: req.user.organizationId ?? null,
      after: { fields: touchedFields },
    });

    return ApiResponse.ok(res, { user: updatedUser }, "Profile updated successfully");
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.authentication.required();
    const data = ChangePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.id, data);
    clearCookies(res);

    logger.info("User changed password", {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    // The password itself is never in the payload we record — only the fact.
    await recordAudit(req, {
      action: "USER_PASSWORD_CHANGED",
      entityType: "USER",
      entityId: req.user.id,
      organizationId: req.user.organizationId ?? null,
    });

    return ApiResponse.ok(res, null, "Password changed successfully. Please login again");
  }),
};
