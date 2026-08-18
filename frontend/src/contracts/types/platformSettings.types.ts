/**
 * Platform-wide configuration, readable and writable by super-admin only.
 *
 * Distinct from organization settings: these values apply across every tenant.
 */
export interface PlatformSettings {
  platformName: string;
  /** Null renders no contact rather than a placeholder address. */
  supportEmail: string | null;
  supportPhone: string | null;
  /** Null keeps audit history forever. */
  auditRetentionDays: number | null;
  defaultPlanId: string | null;
  /** Resolved for display; null when no default plan is set or it was retired. */
  defaultPlanName: string | null;
  updatedAt: string;
  updatedBy: { id: string; name: string } | null;
}

/** The slice every authenticated user may read (sidebar + Help page). */
export interface PublicPlatformSettings {
  platformName: string;
  supportEmail: string | null;
  supportPhone: string | null;
}
