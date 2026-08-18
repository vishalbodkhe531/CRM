import { Prisma, Role, UserStatus } from "@prisma/client";
import { prisma, DB } from "../../config/db";
import { userRepository } from "./user.repository";
import { authRepository } from "../auth/auth.repository";
import { hashPassword } from "../../utils/auth/password";
import { generateTemporaryPassword } from "../../utils/auth/generatePassword";
import { AppError } from "../../utils/errors/appError";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "../../contracts/validation";
import type { User } from "../../contracts/types";
import { organizationRepository } from "../organization/organization.repository";
import { billingRepository } from "../billing/billing.repository";
import { assertWithinLimit } from "../billing/limit.guard";
import { permissions } from "../../utils/security/permission";
import { isPrismaUniqueError } from "../../utils/errors/typeGuards";
import { logger } from "../../config/logger";
import type { SafeUser } from "../../types/user.types";


interface EntityWithPrefix {
  prefix: string;
}

/**
 * Refuse to add a seat when the organization is already at its plan limit.
 *
 * Called from BOTH createUser and enableUser. Enabling matters as much as
 * creating: without the second check, an organization at its limit can disable
 * someone, create a replacement, then re-enable the original and end up one
 * seat over.
 *
 * Super-admin is deliberately NOT exempt. A limit that the platform operator can
 * quietly step around while acting inside a tenant is not a limit.
 *
 * Known race: the count and the insert are not atomic, so two admins claiming
 * the last seat simultaneously can both succeed and leave the org one over.
 * Closing that properly needs a row lock or a conditional insert, which is not
 * worth the complexity at this scale — the overshoot is bounded at one seat and
 * self-corrects the next time anyone is disabled.
 */
/**
 * Seats are just the MAX_USERS limit. The generic guard does the work; this thin
 * wrapper names it and pins the count function. See assertWithinLimit for the
 * fail-open rationale, the super-admin non-exemption, and the bounded race.
 */
const assertSeatAvailable = (organizationId: string, tx?: DB) =>
  assertWithinLimit(
    organizationId,
    "MAX_USERS",
    billingRepository.countActiveSeats,
    tx,
  );

/**
 * Type guard for entities with prefix property
 */
const hasPrefix = (obj: unknown): obj is EntityWithPrefix => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "prefix" in obj &&
    typeof (obj as Record<string, unknown>).prefix === "string"
  );
};

const assertUserInOrganizationScope = (
  targetUser: { organizationId?: string | null },
  loggedInUser: { role: Role },
  organizationId?: string,
) => {
  if (loggedInUser.role === Role.SUPER_ADMIN) {
    if (organizationId && targetUser.organizationId !== organizationId) {
      throw AppError.authorization.forbidden(
        "User does not belong to the requested organization",
      );
    }
    return;
  }

  if (!organizationId) {
    throw AppError.authorization.forbidden(
      "User must belong to an organization",
    );
  }

  if (targetUser.organizationId !== organizationId) {
    throw AppError.authorization.forbidden(
      "Cannot access users outside your organization",
    );
  }
};

const getUserLookupOrganizationId = (
  loggedInUser: { role: Role; organizationId?: string | null },
  organizationId?: string,
): string | undefined => {
  if (loggedInUser.role === Role.SUPER_ADMIN) {
    return organizationId;
  }

  const resolvedOrgId = organizationId ?? loggedInUser.organizationId;
  if (!resolvedOrgId) {
    throw AppError.authorization.forbidden(
      "User must belong to an organization",
    );
  }

  return resolvedOrgId;
};

const getTargetMutationOrganizationId = (
  targetUser: { organizationId?: string | null },
  loggedInUser: { role: Role; organizationId?: string | null },
  organizationId?: string,
): string | undefined => {
  return (
    getUserLookupOrganizationId(loggedInUser, organizationId) ??
    targetUser.organizationId ??
    undefined
  );
};

const getAllowedRoles = (loggedInUserRole: Role): Role[] | undefined => {
  if (loggedInUserRole === Role.ADMIN) {
    return [Role.MANAGER, Role.EXECUTIVE];
  }

  if (loggedInUserRole === Role.MANAGER) {
    return [Role.EXECUTIVE];
  }

  return undefined;
};

// private helper for explicit mapping
const mapToUser = (user: SafeUser): User => {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    mobile: user.mobile,
    profileImage: user.profileImage,
    employeeId: user.employeeId,
    designation: user.designation,
    joiningDate: user.joiningDate instanceof Date ? user.joiningDate.toISOString() : user.joiningDate,
    role: user.role,
    status: user.status,
    organizationId: user.organizationId,
    managerId: user.managerId,
    organization: user.organization ? {
      prefix: user.organization.prefix,
      status: user.organization.status,
    } : null,
    lastLoginAt: user.lastLoginAt instanceof Date ? user.lastLoginAt.toISOString() : user.lastLoginAt,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
};

export const userService = {
  /**
   * Generate employee ID with org prefix
   */
  generateEmployeeId: async (
    organizationId: string,
    tx?: DB,
  ): Promise<string> => {
    const db = tx || prisma;
    const org = await organizationRepository.findById(organizationId, db);
    if (!org) {
      throw AppError.resource.notFound("Organization");
    }

    if (!hasPrefix(org)) {
      throw AppError.system.internal("Organization prefix missing");
    }

    // 🔥 Atomic increment using UserSequence
    const seq = await (db as Prisma.TransactionClient).userSequence.update({
      where: { organizationId },
      data: {
        lastSequence: { increment: 1 },
      },
    });

    const paddedSeq = String(seq.lastSequence).padStart(3, "0");
    return `${org.prefix}-${paddedSeq}`;
  },

  /**
   * Prevents circular management hierarchies (e.g., A -> B -> A)
   */
  checkCircularManager: async (
    userId: string,
    targetManagerId: string,
    organizationId: string,
    tx?: DB,
  ): Promise<void> => {
    let currentId = targetManagerId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === userId) {
        throw AppError.validation.badRequest(
          "Circular manager hierarchy detected",
        );
      }
      if (visited.has(currentId)) break; // Safety
      visited.add(currentId);

      const manager = await userRepository.findById(
        currentId,
        organizationId,
        { managerId: true },
        tx,
      );
      if (!manager || !manager.managerId) break;
      currentId = manager.managerId;
    }
  },

  /**
   * Create a new user (auto-generates employeeId with org prefix)
   */
  createUser: async (
    data: CreateUserInput,
    loggedInUser: { id: string; role: string; organizationId?: string | null },
    organizationId?: string,
  ): Promise<User> => {
    return prisma.$transaction(async (tx: DB) => {
      const {
        email,
        password,
        firstName,
        lastName,
        middleName,
        mobile,
        role,
        profileImage,
        managerId,
        employeeId, // Optional - if provided, validate it has correct prefix
        designation,
        joiningDate,
      } = data;

      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await userRepository.findByEmail(
        normalizedEmail,
        undefined,
        tx,
      );
      if (existingUser) {
        throw AppError.resource.conflict("User already exists");
      }

      // Use permissions utility for role-based authorization
      if (!permissions.canCreateRole(loggedInUser.role as Role, role as Role)) {
        throw AppError.authorization.forbidden(
          `${loggedInUser.role} cannot create ${role} users`,
        );
      }

      // super_admin and admin cannot be assigned a managerId
      if (role === Role.ADMIN && managerId) {
        throw AppError.validation.badRequest(
          "Admin cannot be assigned a manager",
        );
      }

      const effectiveManagerId =
        loggedInUser.role === Role.MANAGER ? loggedInUser.id : managerId;

      if (role === Role.MANAGER && effectiveManagerId) {
        throw AppError.validation.badRequest(
          "Manager cannot be assigned another manager",
        );
      }

      const resolvedOrgId = (organizationId ??
        loggedInUser.organizationId) as string;
      if (!resolvedOrgId) {
        throw AppError.validation.badRequest(
          "Organization context is required",
        );
      }

      // Inside the transaction and before any write, so a rejected create leaves
      // nothing behind — notably no consumed employeeId sequence value.
      await assertSeatAvailable(resolvedOrgId, tx);

      if (effectiveManagerId) {
        const manager = await userRepository.findById(
          effectiveManagerId,
          resolvedOrgId,
          undefined,
          tx,
        );
        if (!manager) {
          throw AppError.validation.badRequest("Invalid manager ID");
        }

        if (manager.organizationId !== resolvedOrgId) {
          throw AppError.validation.badRequest(
            "Manager must belong to the same organization",
          );
        }
      }

      const hashedPassword = await hashPassword(password);

      // Retry mechanism for employeeId collision
      let attempts = 0;
      let user: SafeUser | undefined;

      while (attempts < 3) {
        try {
          // Auto-generate employeeId if not provided
          let finalEmployeeId = employeeId || null;
          if (!finalEmployeeId) {
            finalEmployeeId = await userService.generateEmployeeId(
              resolvedOrgId,
              tx,
            );
          } else if (finalEmployeeId) {
            // Validate prefix if manually provided
            const org = await organizationRepository.findById(
              resolvedOrgId,
              tx,
            );
            if (org && hasPrefix(org)) {
              if (!finalEmployeeId.startsWith(`${org.prefix}-`)) {
                throw AppError.validation.badRequest(
                  `Employee ID must start with "${org.prefix}-" prefix`,
                );
              }
            }
          }

          user = await userRepository.create(
            {
              role: role as Role,
              firstName,
              middleName: middleName ?? null,
              lastName,
              mobile: mobile ?? null,
              email: normalizedEmail,
              password: hashedPassword,
              profileImage: profileImage ?? null,
              employeeId: finalEmployeeId,
              designation: designation ?? null,
              joiningDate: joiningDate ? new Date(joiningDate) : null,
              organization: { connect: { id: resolvedOrgId } },
              manager: effectiveManagerId
                ? { connect: { id: effectiveManagerId } }
                : undefined,
              passwordChangedAt: new Date(),
            },
            tx,
          );

          logger.info("User created", {
            userId: loggedInUser.id,
            organizationId: resolvedOrgId,
            targetUserId: user.id,
          });

          if (!user) {
            throw AppError.system.internal("Failed to create user");
          }

          return mapToUser(user);
        } catch (err) {
          if (isPrismaUniqueError(err)) {
            const prismaError = err as Prisma.PrismaClientKnownRequestError;
            const target = (prismaError.meta?.target as string[] | undefined) ?? [];
            const errorMessage = prismaError.message;

            const isEmployeeIdConflict =
              target.includes("employeeId") ||
              errorMessage.includes("employeeId") ||
              errorMessage.includes("employee_id");

            if (isEmployeeIdConflict && !employeeId) {
              // Only retry if we auto-generated it
              attempts++;
              if (attempts < 3) {
                logger.warn("Employee ID conflict detected. Retrying with next sequence...", {
                  attempts,
                  organizationId: resolvedOrgId
                });
                continue;
              }
            }

            if (target.includes("email") || errorMessage.includes("email")) {
              throw AppError.resource.alreadyExists("User", "email");
            }

            throw AppError.resource.conflict(
              `Request conflicts with existing data: ${target.length > 0 ? target.join(", ") : "Unique constraint violation"}`,
            );
          }
          throw err;
        }
      }

      throw AppError.business.ruleViolation(
        "Failed to generate a unique employee ID after multiple attempts",
      );
    });
  },

  /**
   * Get users based on requester role and organization scope
   */
  getAllUsers: async (
    loggedInUser: { id: string; role: Role; organizationId?: string | null },
    params: { search?: string; role?: Role | Role[]; status?: string | string[]; page: number; limit: number },
    organizationId?: string,
  ) => {
    const { search, role, status, page, limit } = params;
    const where: Prisma.UserWhereInput = {};

    const allowedRoles = getAllowedRoles(loggedInUser.role);

    if (loggedInUser.role === Role.SUPER_ADMIN) {
      if (organizationId) {
        where.organizationId = organizationId;
      }
      where.id = { not: loggedInUser.id };
    } else {
      const resolvedOrgId = (organizationId ??
        loggedInUser.organizationId) as string;
      if (!resolvedOrgId) {
        throw AppError.authorization.forbidden(
          "User must belong to an organization",
        );
      }
      where.organizationId = resolvedOrgId;
      if (allowedRoles) {
        where.role = { in: allowedRoles };
      }

      // ❗ Manager can only see their own executives
      if (loggedInUser.role === Role.MANAGER) {
        where.managerId = loggedInUser.id;
      }
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: (status as string[]).map(s => s.toUpperCase() as UserStatus) };
      } else {
        where.status = (status as string).toUpperCase() as UserStatus;
      }
    }
    
    if (role) {
      const requestedRoles = Array.isArray(role) ? (role as Role[]) : [role as Role];
      
      // Filter requested roles by allowed roles
      const filteredRoles = allowedRoles 
        ? requestedRoles.filter(r => allowedRoles.includes(r))
        : requestedRoles;

      if (filteredRoles.length === 0 && requestedRoles.length > 0) {
        return {
          data: [],
          meta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }

      where.role = filteredRoles.length > 1 
        ? { in: filteredRoles } 
        : filteredRoles[0];
    }

    const users = await userRepository.getUsers(where, { page, limit });
    return {
      ...users,
      data: users.data.map((u) => mapToUser(u)),
    };
  },

  /**
   * Get target user by ID with organization scope and permission checks
   */
  getUserById: async (
    id: string,
    loggedInUser: SafeUser,
    organizationId?: string,
  ): Promise<User> => {
    const scopedOrgId = getUserLookupOrganizationId(
      loggedInUser,
      organizationId,
    );

    const user = await userRepository.findById(id, scopedOrgId);
    if (!user) {
      throw AppError.resource.notFound("User");
    }

    // Role-based visibility check
    if (!permissions.canManageUser(loggedInUser.role as Role, user.role)) {
      // If they can't manage, maybe they are the user themselves?
      if (loggedInUser.id !== user.id) {
         throw AppError.authorization.forbidden(
          `Insufficient permissions to view this ${user.role}`,
        );
      }
    }

    return mapToUser(user);
  },

  /**
   * Update user
   */
  updateUser: async (
    id: string,
    data: Partial<UpdateUserInput>,
    loggedInUser: SafeUser,
    organizationId?: string,
  ): Promise<User> => {
    const scopedOrgId = getUserLookupOrganizationId(
      loggedInUser,
      organizationId,
    );
    const user = await userRepository.findById(id, scopedOrgId);
    if (!user) {
      throw AppError.resource.notFound("User");
    }

    const targetOrgId = getTargetMutationOrganizationId(
      user,
      loggedInUser,
      organizationId,
    );

    // Use permissions utility to check if loggedInUser can manage targetUser
    if (!permissions.canManageUser(loggedInUser.role as Role, user.role)) {
      throw AppError.authorization.forbidden(
        `Insufficient permissions to update this ${user.role}`,
      );
    }

    // Self-update restriction
    if (permissions.isRestrictedSelfUpdate(loggedInUser.id, user.id, data)) {
      throw AppError.authorization.forbidden("Cannot change own role");
    }

    // Prevent self-disable
    if (loggedInUser.id === user.id && data.status && data.status.toUpperCase() === "INACTIVE") {
      throw AppError.validation.badRequest("Cannot disable your own account");
    }

    // 🛡️ Multi-Tenancy Guard: Validate new managerId belongs to same organization
    if (data.managerId) {
      if (!targetOrgId) {
        throw AppError.validation.badRequest(
          "Organization context is required to assign a manager",
        );
      }

      const manager = await userRepository.findById(
        data.managerId,
        targetOrgId,
      );
      if (!manager) {
        throw AppError.validation.badRequest("Selected manager not found in your organization");
      }
    }

    // Handle password update if provided
    const { password, role, ...updateData } = data;
    const finalUpdateData: Prisma.UserUncheckedUpdateInput = {
      ...updateData,
      status: updateData.status
        ? (updateData.status.toUpperCase() as UserStatus)
        : undefined,
    };

    // 🔒 Security Sync: Force session invalidation if critical fields change
    const input = data as any;
    const isCriticalChange = 
      (input.role && input.role !== user.role) || 
      (input.organizationId && input.organizationId !== user.organizationId) ||
      (input.status && input.status.toUpperCase() !== user.status);

    if (password || isCriticalChange) {
      if (password) {
         finalUpdateData.password = await hashPassword(password);
      }
      finalUpdateData.passwordChangedAt = new Date();
    }

    if (updateData.managerId) {
      if (!targetOrgId) {
        throw AppError.validation.badRequest(
          "Organization context is required to assign a manager",
        );
      }

      await userService.checkCircularManager(
        id,
        updateData.managerId,
        targetOrgId,
      );
    }

    try {
      const updatedUser = await userRepository.update(
        id,
        finalUpdateData,
        targetOrgId,
      );

      logger.info("User updated", {
        userId: loggedInUser.id,
        organizationId: targetOrgId,
        targetUserId: id,
        sessionInvalidated: isCriticalChange,
      });

      if (!updatedUser) {
        throw AppError.resource.notFound("User");
      }

      return mapToUser(updatedUser);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (target.includes("email")) throw AppError.resource.alreadyExists("User", "email");
        if (target.includes("employeeId")) throw AppError.resource.alreadyExists("User", "employeeId");
        
        throw AppError.resource.conflict("Update violates unique constraint");
      }
      throw err;
    }
  },

  /**
   * Delete user
   */
  deleteUser: async (
    id: string,
    loggedInUser: SafeUser,
    organizationId?: string,
  ): Promise<User> => {
    const scopedOrgId = getUserLookupOrganizationId(
      loggedInUser,
      organizationId,
    );
    const user = await userRepository.findById(id, scopedOrgId);
    if (!user) {
      throw AppError.resource.notFound("User");
    }

    assertUserInOrganizationScope(user, loggedInUser, scopedOrgId);
    const targetOrgId = getTargetMutationOrganizationId(
      user,
      loggedInUser,
      organizationId,
    );

    // Prevent deleting own account
    if (user.id === loggedInUser.id) {
      throw AppError.validation.badRequest("Cannot delete yourself");
    }

    // Use permissions utility
    if (!permissions.canManageUser(loggedInUser.role as Role, user.role)) {
      throw AppError.authorization.forbidden(
        `Insufficient permissions to delete this ${user.role}`,
      );
    }

    // SOFT DELETE: Mark as permanently deleted to preserve referential integrity
    const deletedUser = await userRepository.update(
      id,
      { 
        status: UserStatus.INACTIVE,
        deletedAt: new Date(),
        deletedById: loggedInUser.id,
        passwordChangedAt: new Date() // Kill sessions immediately
      },
      targetOrgId,
    );

    logger.info("User soft-deleted permanently", {
      userId: loggedInUser.id,
      organizationId: targetOrgId,
      targetUserId: id,
    });

    if (!deletedUser) {
      throw AppError.resource.notFound("User");
    }

    return mapToUser(deletedUser);
  },

  /**
   * Reset a user's password to a generated temporary one.
   *
   * Super-admin only. This is the recovery path for a locked-out tenant admin:
   * there is no email transport in this system, so the generated password is
   * returned once for the super-admin to pass on out of band.
   *
   * The plaintext password is never stored and must never be logged — it exists
   * only in the return value of this call.
   */
  resetUserPassword: async (
    id: string,
    loggedInUser: SafeUser,
    organizationId?: string,
  ): Promise<{ user: User; temporaryPassword: string }> => {
    // Checked here, not only on the route: USER_UPDATE is also held by admins
    // and managers, so permission alone is not a sufficient gate for this.
    if (loggedInUser.role !== Role.SUPER_ADMIN) {
      throw AppError.authorization.forbidden(
        "Only a super admin can reset another user's password",
      );
    }

    const scopedOrgId = getUserLookupOrganizationId(
      loggedInUser,
      organizationId,
    );
    const user = await userRepository.findById(id, scopedOrgId);
    if (!user) {
      throw AppError.resource.notFound("User");
    }

    assertUserInOrganizationScope(user, loggedInUser, scopedOrgId);
    const targetOrgId = getTargetMutationOrganizationId(
      user,
      loggedInUser,
      organizationId,
    );

    // Self-service goes through /auth/change-password, which verifies the
    // current password first. Resetting yourself here would skip that.
    if (user.id === loggedInUser.id) {
      throw AppError.validation.badRequest(
        "Use change password to update your own password",
      );
    }

    if (!permissions.canManageUser(loggedInUser.role as Role, user.role)) {
      throw AppError.authorization.forbidden(
        `Insufficient permissions to reset this ${user.role}'s password`,
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(temporaryPassword);

    const updatedUser = await userRepository.update(
      id,
      {
        password: hashedPassword,
        // Invalidates every outstanding access token — auth.middleware rejects
        // any token issued before passwordChangedAt.
        passwordChangedAt: new Date(),
      },
      targetOrgId,
    );

    if (!updatedUser) {
      throw AppError.resource.notFound("User");
    }

    // Access tokens are dead by the check above; refresh tokens must be deleted
    // explicitly or the session could be renewed with the old credentials.
    await authRepository.deleteAllUserRefreshTokens(id);

    logger.warn("User password reset by super admin", {
      userId: loggedInUser.id,
      targetUserId: id,
      organizationId: targetOrgId,
    });

    return { user: mapToUser(updatedUser), temporaryPassword };
  },

  /**
   * Disable user account
   */
  disableUser: async (
    id: string,
    loggedInUser: SafeUser,
    organizationId?: string,
  ) => {
    const scopedOrgId = getUserLookupOrganizationId(
      loggedInUser,
      organizationId,
    );
    const user = await userRepository.findById(id, scopedOrgId);
    if (!user) {
      throw AppError.resource.notFound("User");
    }

    assertUserInOrganizationScope(user, loggedInUser, scopedOrgId);
    const targetOrgId = getTargetMutationOrganizationId(
      user,
      loggedInUser,
      organizationId,
    );

    // Prevent disabling own account
    if (user.id === loggedInUser.id) {
      throw AppError.validation.badRequest("Cannot disable yourself");
    }

    // Use permissions utility
    if (!permissions.canManageUser(loggedInUser.role as Role, user.role)) {
      throw AppError.authorization.forbidden(
        `Insufficient permissions to disable this ${user.role}`,
      );
    }

    const updatedUser = await userRepository.update(
      id,
      { 
        status: UserStatus.INACTIVE,
        passwordChangedAt: new Date() // Kill sessions immediately
      },
      targetOrgId,
    );

    if (!updatedUser) {
      throw AppError.resource.notFound("User");
    }

    return mapToUser(updatedUser);
  },

  /**
   * Enable user account
   */
  enableUser: async (
    id: string,
    loggedInUser: SafeUser,
    organizationId?: string,
  ): Promise<User> => {
    const scopedOrgId = getUserLookupOrganizationId(
      loggedInUser,
      organizationId,
    );
    const user = await userRepository.findById(id, scopedOrgId);
    if (!user) {
      throw AppError.resource.notFound("User");
    }

    assertUserInOrganizationScope(user, loggedInUser, scopedOrgId);
    const targetOrgId = getTargetMutationOrganizationId(
      user,
      loggedInUser,
      organizationId,
    );

    // Use permissions utility
    if (!permissions.canManageUser(loggedInUser.role as Role, user.role)) {
      throw AppError.authorization.forbidden(
        `Insufficient permissions to enable this ${user.role}`,
      );
    }

    // Re-enabling consumes a seat exactly as creating one does — see
    // assertSeatAvailable for why skipping this check is exploitable. Run the
    // check and the status flip in ONE transaction, matching createUser, so the
    // seat count cannot move between them (the create path already does this;
    // the enable path previously did not, widening the race).
    const enabledUser = await prisma.$transaction(async (tx: DB) => {
      if (user.status !== UserStatus.ACTIVE && targetOrgId) {
        await assertSeatAvailable(targetOrgId, tx);
      }

      return userRepository.update(
        id,
        { status: UserStatus.ACTIVE },
        targetOrgId,
        tx,
      );
    });

    logger.info("User enabled", {
      userId: loggedInUser.id,
      organizationId: targetOrgId,
      targetUserId: id,
    });

    if (!enabledUser) {
      throw AppError.resource.notFound("User");
    }

    return mapToUser(enabledUser);
  },

  async getUserStats(organizationId: string) {
    const [total, active] = await Promise.all([
      prisma.user.count({
        where: { organizationId, deletedAt: null },
      }),
      prisma.user.count({
        where: { organizationId, deletedAt: null, status: UserStatus.ACTIVE },
      }),
    ]);
    return { total, active, inactive: total - active };
  },
};
