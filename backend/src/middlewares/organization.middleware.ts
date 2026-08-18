import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors/appError";
import { organizationRepository } from "../modules/organization/organization.repository";
import { Role } from "@prisma/client";

/**
 * Multi-Tenancy Middleware
 *
 * Normal users  → always pinned to their own organization.
 * Super admin   → must name the tenant explicitly via `x-organization-id`.
 *
 * Mount this on tenant-data routers ONLY. Every router that mounts it is a
 * tenant surface, so after this middleware runs `req.organizationId` is always
 * set — which is what makes the `req.organizationId!` assertions in the
 * controllers downstream truthful rather than a silent `undefined`.
 *
 * Platform surfaces (the super-admin dashboard, the plan/subscription console,
 * audit, announcements, notifications) deliberately do NOT mount this and read
 * unscoped by design.
 */

export const requireOrganization = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user) {
      throw AppError.authentication.unauthorized("User not authenticated");
    }

    /**
     * ✅ SUPER ADMIN (MUST SCOPE EXPLICITLY)
     *
     * A super admin has no organization of their own, so without a header there
     * is no tenant to filter by. Letting the request through in that state left
     * `req.organizationId` undefined, and Prisma drops an undefined `where` key
     * — so `GET /users`, `/leads`, `/items`, `/prospects`, `/quotations` and
     * `/reports` each returned every tenant's rows in one response.
     *
     * Refusing here rather than in each service keeps the boundary in one place
     * and cannot be forgotten by a new tenant module.
     */
    if (user.role === Role.SUPER_ADMIN) {
      const scopedOrganizationId = req.get("x-organization-id")?.trim();

      if (!scopedOrganizationId) {
        throw AppError.authorization.forbidden(
          "Select an organization to access its data. Tenant endpoints require the x-organization-id header.",
        );
      }

      const organization = await organizationRepository.findById(scopedOrganizationId);

      if (!organization) {
        throw AppError.authorization.forbidden("Invalid organization scope");
      }

      req.organizationId = scopedOrganizationId;

      return next();
    }

    /**
     * ✅ NORMAL USERS (STRICT)
     */
    if (!user.organizationId) {
      throw AppError.authorization.forbidden(
        "User must belong to an organization",
      );
    }

    // Always enforce org scope
    req.organizationId = user.organizationId;

    next();
  } catch (error) {
    next(error);
  }
};
