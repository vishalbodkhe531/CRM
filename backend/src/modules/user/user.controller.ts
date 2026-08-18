import { Response } from "express";
import { ApiResponse } from "../../utils/response/response";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { AppError } from "../../utils/errors/appError";
import { userService } from "./user.service";
import { logger } from "../../config/logger";
import { recordAudit } from "../../utils/audit/recordAudit";
import { pickFields } from "../audit/audit.service";
import { 
  CreateUserSchema, 
  UpdateUserSchema,
  UserFilterSchema
} from "../../contracts/validation";

/**
 * User Controller - HTTP Boundary for User Management
 *
 * Rules:
 * - No direct Prisma calls (use services)
 * - Standardized logging with context
 * - Middleware guarantees req.user and req.organizationId
 * - Standardized response format
 */

/** Whitelisted user fields captured in audit snapshots. Never spread the entity. */
const AUDITED_USER_FIELDS = [
  "id",
  "email",
  "firstName",
  "lastName",
  "role",
  "status",
  "designation",
  "managerId",
  "organizationId",
] as const;

export const userController = {
  createUser: asyncHandler(async (req, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    // Middleware (validateData) already parsed req.body with createUserSchema
    const data = CreateUserSchema.parse(req.body);
    const newUser = await userService.createUser(
      data,
      user,
      organizationId,
    );

    logger.info("User created", {
      userId: user.id,
      organizationId,
      targetUserId: newUser.id,
      role: newUser.role,
    });

    await recordAudit(req, {
      action: "USER_CREATED",
      entityType: "USER",
      entityId: newUser.id,
      organizationId: newUser.organizationId ?? organizationId,
      after: pickFields(newUser, AUDITED_USER_FIELDS),
    });

    return ApiResponse.created(res, newUser, "User created successfully");
  }),

  getAllUsers: asyncHandler(async (req, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const query = UserFilterSchema.parse(req.query);
    const usersResult = await userService.getAllUsers(
      user,
      query,
      organizationId,
    );

    logger.info("Users fetched", {
      userId: user.id,
      organizationId,
      count: usersResult.data.length,
    });

    return ApiResponse.ok(
      res,
      usersResult.data,
      "Users fetched successfully",
      usersResult.meta,
    );
  }),

  getUserById: asyncHandler(async (req, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Valid User ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const targetUser = await userService.getUserById(
      id,
      user,
      organizationId,
    );

    logger.info("User fetched by ID", {
      userId: user.id,
      organizationId,
      targetUserId: id,
    });

    return ApiResponse.ok(res, targetUser, "User fetched successfully");
  }),

  updateUser: asyncHandler(async (req, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Valid User ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    // Middleware (validateData) already parsed req.body with updateUserSchema
    const data = UpdateUserSchema.parse(req.body);

    // Read the prior state for the audit diff. An extra read is acceptable here:
    // user updates are low-frequency admin actions, and the service cannot
    // return the previous value without changing its response contract.
    const previousUser = await userService.getUserById(id, user, organizationId);

    const updatedUser = await userService.updateUser(
      id,
      data,
      user,
      organizationId,
    );

    logger.info("User updated", {
      userId: user.id,
      organizationId,
      targetUserId: id,
    });

    await recordAudit(req, {
      action:
        previousUser.role !== updatedUser.role
          ? "USER_ROLE_CHANGED"
          : "USER_UPDATED",
      entityType: "USER",
      entityId: id,
      organizationId: updatedUser.organizationId ?? organizationId,
      before: pickFields(previousUser, AUDITED_USER_FIELDS),
      after: pickFields(updatedUser, AUDITED_USER_FIELDS),
    });

    return ApiResponse.ok(res, updatedUser, "User updated successfully");
  }),

  deleteUser: asyncHandler(async (req, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Valid User ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const deletedUser = await userService.deleteUser(id, user, organizationId);

    logger.info("User deleted", {
      userId: user.id,
      organizationId,
      targetUserId: id,
    });

    await recordAudit(req, {
      action: "USER_DELETED",
      entityType: "USER",
      entityId: id,
      organizationId: deletedUser?.organizationId ?? organizationId,
      before: pickFields(deletedUser, AUDITED_USER_FIELDS),
    });

    return ApiResponse.ok(res, null, "User deleted successfully");
  }),

  resetUserPassword: asyncHandler(async (req, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Valid User ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const { user: targetUser, temporaryPassword } =
      await userService.resetUserPassword(id, user, organizationId);

    // Deliberately omits the generated password — this log line and the audit
    // row below must never carry the credential.
    logger.warn("User password reset", {
      userId: user.id,
      organizationId,
      targetUserId: id,
    });

    await recordAudit(req, {
      action: "USER_PASSWORD_RESET",
      entityType: "USER",
      entityId: id,
      organizationId: targetUser.organizationId ?? organizationId,
      after: {
        email: targetUser.email,
        role: targetUser.role,
        sessionsRevoked: true,
      },
    });

    return ApiResponse.ok(
      res,
      { user: targetUser, temporaryPassword },
      "Password reset successfully",
    );
  }),

  disableUser: asyncHandler(async (req, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Valid User ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const previousUser = await userService.getUserById(id, user, organizationId);
    const disabledUser = await userService.disableUser(
      id,
      user,
      organizationId,
    );

    logger.info("User disabled", {
      userId: user.id,
      organizationId,
      targetUserId: id,
    });

    await recordAudit(req, {
      action: "USER_DISABLED",
      entityType: "USER",
      entityId: id,
      organizationId: disabledUser.organizationId ?? organizationId,
      before: pickFields(previousUser, AUDITED_USER_FIELDS),
      after: pickFields(disabledUser, AUDITED_USER_FIELDS),
    });

    return ApiResponse.ok(res, disabledUser, "User disabled successfully");
  }),

  enableUser: asyncHandler(async (req, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Valid User ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const previousUser = await userService.getUserById(id, user, organizationId);
    const enabledUser = await userService.enableUser(
      id,
      user,
      organizationId,
    );

    logger.info("User enabled", {
      userId: user.id,
      organizationId,
      targetUserId: id,
    });

    await recordAudit(req, {
      action: "USER_ENABLED",
      entityType: "USER",
      entityId: id,
      organizationId: enabledUser.organizationId ?? organizationId,
      before: pickFields(previousUser, AUDITED_USER_FIELDS),
      after: pickFields(enabledUser, AUDITED_USER_FIELDS),
    });

    return ApiResponse.ok(res, enabledUser, "User enabled successfully");
  }),

  getStats: asyncHandler(async (req, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const stats = await userService.getUserStats(organizationId);

    logger.info("User stats fetched", {
      userId: user.id,
      role: user.role,
      organizationId,
    });

    return ApiResponse.ok(res, stats, "User stats fetched successfully");
  }),
};
