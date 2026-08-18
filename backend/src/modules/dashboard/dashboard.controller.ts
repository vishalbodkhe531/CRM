import { Request, Response } from "express";
import { ApiResponse } from "../../utils/response/response";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { dashboardService } from "./dashboard.service";
import { logger } from "../../config/logger";

/**
 * Dashboard Controller - HTTP Boundary for Dashboard Stats
 *
 * Rules:
 * - Delegate to dashboardService.
 * - Middleware guarantees req.user (and req.organizationId for org-scoped routes).
 * - Standardized logging with context.
 * - Standardized response format.
 */
export const dashboardController = {
  /* ================= SUPER ADMIN DASHBOARD ================= */
  superAdminDashboard: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;

    const stats = await dashboardService.getSuperAdminDashboardOptions();

    logger.info("Super admin dashboard stats fetched", {
      userId: user.id,
    });

    return ApiResponse.ok(res, stats, "Super admin dashboard stats");
  }),

  /* ================= ADMIN DASHBOARD ================= */
  adminDashboard: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const stats = await dashboardService.getAdminDashboardOptions(organizationId);

    logger.info("Admin dashboard stats fetched", {
      userId: user.id,
      organizationId,
      role: user.role,
    });

    return ApiResponse.ok(res, stats, "Admin dashboard stats");
  }),

  /* ================= MANAGER DASHBOARD ================= */
  managerDashboard: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const stats = await dashboardService.getManagerDashboardOptions(
      user.id,
      organizationId,
    );

    logger.info("Manager dashboard stats fetched", {
      userId: user.id,
      organizationId,
    });

    return ApiResponse.ok(res, stats, "Manager dashboard stats");
  }),

  /* ================= EXECUTIVE DASHBOARD ================= */
  executiveDashboard: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const stats = await dashboardService.getExecutiveDashboardOptions(
      user.id,
      organizationId,
    );

    logger.info("Executive dashboard stats fetched", {
      userId: user.id,
      organizationId,
    });

    return ApiResponse.ok(res, stats, "Executive dashboard stats");
  }),
};
