import { dashboardRepository } from "./dashboard.repository";
import { AppError } from "../../utils/errors/appError";
import {
  SuperAdminStatsDTO,
  AdminStatsDTO,
  ManagerStatsDTO,
  ExecutiveStatsDTO,
} from "../../contracts/dashboard";
import { dashboardMapper } from "./dashboard.mapper";
import { createTtlCache } from "../../utils/cache/ttlCache";
import { istStartOfDay, istEndOfDay } from "../../utils/business/dateUtils";

/**
 * The platform dashboard is a dozen aggregates over every tenant, it is
 * identical for every super-admin, and it is refetched on window focus. Ninety
 * seconds of staleness is invisible on a lifetime-metrics screen and removes
 * almost all of that load.
 *
 * Only the SUPER-ADMIN dashboard is cached. The tenant dashboards are per
 * organization and per user, so a single shared slot would serve one tenant's
 * numbers to another.
 */
const SUPER_ADMIN_STATS_TTL_MS = 90_000;

const superAdminStatsCache = createTtlCache<SuperAdminStatsDTO>(
  SUPER_ADMIN_STATS_TTL_MS,
);

/**
 * Dashboard Service
 *
 * Rules:
 * - Only imports dashboardRepository. No cross-service imports.
 * - Each method is a thin delegation: validate → repository → mapper.
 * - Data shaping and all DB queries live in the repository.
 */
export const dashboardService = {
  /* ─── Super Admin ─────────────────────────────────────────────── */
  async getSuperAdminDashboardOptions(): Promise<SuperAdminStatsDTO> {
    return superAdminStatsCache.get(async () => {
      const stats = await dashboardRepository.getSuperAdminStats();
      return dashboardMapper.toSuperAdminDTO(stats);
    });
  },

  /**
   * Drop the cached platform stats.
   *
   * Called after an action that visibly moves the numbers — archiving or
   * restoring an organization — so the operator sees the effect of what they
   * just did instead of waiting out the TTL and assuming it failed.
   */
  invalidateSuperAdminDashboard(): void {
    superAdminStatsCache.invalidate();
  },

  /* ─── Admin ──────────────────────────────────────────────────── */
  async getAdminDashboardOptions(organizationId: string): Promise<AdminStatsDTO> {
    if (!organizationId) {
      throw AppError.validation.badRequest("Organization ID is required");
    }
    // The repository handles all 19 queries in one Promise.all.
    // No user context needed — admin dashboard shows org-wide data.
    return dashboardRepository.getAdminDashboardData(organizationId);
  },

  /* ─── Manager ────────────────────────────────────────────────── */
  async getManagerDashboardOptions(
    managerId: string,
    organizationId: string,
  ): Promise<ManagerStatsDTO> {
    if (!organizationId) {
      throw AppError.validation.badRequest("Organization ID is required");
    }

    const startOfDay = istStartOfDay();
    const endOfDay = istEndOfDay();

    const stats = await dashboardRepository.getManagerStats(
      managerId,
      organizationId,
      startOfDay,
      endOfDay,
    );
    return dashboardMapper.toManagerDTO(stats);
  },

  /* ─── Executive ──────────────────────────────────────────────── */
  async getExecutiveDashboardOptions(
    executiveId: string,
    organizationId: string,
  ): Promise<ExecutiveStatsDTO> {
    const startOfDay = istStartOfDay();
    const endOfDay = istEndOfDay();

    const stats = await dashboardRepository.getExecutiveStats(
      executiveId,
      organizationId,
      startOfDay,
      endOfDay,
    );
    return dashboardMapper.toExecutiveDTO(stats);
  },
};
