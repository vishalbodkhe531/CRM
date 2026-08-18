import { auditService } from "../audit/audit.service";
import { platformSettingsRepository } from "../platformSettings/platformSettings.repository";

/**
 * Audit retention purge.
 *
 * The audit table is append-only everywhere else in the application — this job
 * is the single exception, and it only acts on an explicit retention window set
 * in Platform Settings. With retention unset (the default) it deletes nothing,
 * so a compliance trail is never discarded by omission.
 *
 * Idempotent by construction: it deletes by age, so running it twice in a row
 * finds nothing to do the second time.
 *
 * Reported as `skipped` rather than `created` — the registry's counters are
 * named for jobs that emit notifications, and inflating "created" with deleted
 * rows would misreport the scheduler's summary.
 */
export const runAuditRetention = async (
  _now: Date,
): Promise<{ created: number; skipped: number }> => {
  const settings = await platformSettingsRepository.get();

  const { removed } = await auditService.purgeExpiredLogs(
    settings.auditRetentionDays,
  );

  return { created: 0, skipped: removed };
};
