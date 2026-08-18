import { NextFunction, Request, Response, Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { allowPermission } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../constants/permissions";
import { ROLES, UserRole } from "../../constants/roles";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireOrganization } from "../../middlewares/organization.middleware";
import { AppError } from "../../utils/errors/appError";

const router = Router();

const allowDashboardRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw AppError.authentication.tokenInvalid("Authentication required");
      }

      if (!roles.includes(user.role as UserRole)) {
        throw AppError.authorization.forbidden(
          "Access denied: dashboard role mismatch",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// All dashboard routes require authentication
router.use(requireAuth);

// Super admin doesn't need organization context (can see all orgs)
router.get(
  "/super-admin",
  allowPermission(PERMISSIONS.DASHBOARD_READ),
  allowDashboardRole(ROLES.SUPER_ADMIN),
  dashboardController.superAdminDashboard,
);

// Admin, Manager, Executive need organization context
router.use(requireOrganization);

router.get(
  "/admin",
  allowPermission(PERMISSIONS.DASHBOARD_READ),
  allowDashboardRole(ROLES.ADMIN),
  dashboardController.adminDashboard,
);

router.get(
  "/manager",
  allowPermission(PERMISSIONS.DASHBOARD_READ),
  allowDashboardRole(ROLES.MANAGER),
  dashboardController.managerDashboard,
);

router.get(
  "/executive",
  allowPermission(PERMISSIONS.DASHBOARD_READ),
  allowDashboardRole(ROLES.EXECUTIVE),
  dashboardController.executiveDashboard,
);

export default router;
