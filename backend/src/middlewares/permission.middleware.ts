import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors/appError";
import { Permission } from "../constants/permissions";
import { ROLE_PERMISSIONS } from "../constants/rolePermissions";
import { ROLES, UserRole } from "../constants/roles";

/**
 * Middleware to check if the authenticated user has the required permission.
 * 
 * Usage: router.get("/", allowPermission(PERMISSIONS.USER_READ), userController.getAllUsers);
 */
export const allowPermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw AppError.authentication.tokenInvalid("Authentication required");
      }

      // Super admin has all permissions
      if (user.role === ROLES.SUPER_ADMIN) {
        return next();
      }

      const userPermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];

      if (!userPermissions.includes(permission)) {
        throw AppError.authorization.forbidden(
          `Permission denied: ${permission} required`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
