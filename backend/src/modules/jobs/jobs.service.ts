import { logger } from "../../config/logger";
import type { JobRunResult, JobsRunSummary } from "../../contracts/types";
import { runAuditRetention } from "./auditRetention.job";
import { runFollowUpReminders, runFollowUpOverdue } from "./followUp.job";
import { runSubscriptionWarnings } from "./subscription.job";

/**
 * Scheduled job registry.
 *
 * There is no in-process scheduler: the platform (Render Cron, a GitHub Action,
 * anything that can make an HTTP call) hits POST /internal/jobs/run on a timer.
 * That choice survives running more than one API instance, which an in-process
 * timer does not — it would fire once per replica and notify everyone twice.
 *
 * Every job must be IDEMPOTENT. The scheduler will occasionally fire twice, and
 * a retry after a timeout is normal. Idempotency is enforced at the database
 * level by Notification.dedupeKey rather than by careful querying, so a bug in a
 * job's WHERE clause still cannot double-notify.
 */

type JobHandler = (now: Date) => Promise<{ created: number; skipped: number }>;

export const JOB_HANDLERS: Record<string, JobHandler> = {
  "follow-up-reminders": runFollowUpReminders,
  "follow-up-overdue": (now) => runFollowUpOverdue(now),
  "subscription-warnings": runSubscriptionWarnings,
  /**
   * Housekeeping, not a notification. Worth running far less often than the
   * others — name it explicitly on a daily schedule rather than letting it ride
   * along with every notification sweep.
   */
  "audit-retention": runAuditRetention,
};

export const JOB_NAMES = Object.keys(JOB_HANDLERS);

export const jobsService = {
  /**
   * Run the named jobs, or all of them.
   *
   * One job failing must NOT prevent the others from running: these are
   * independent, and a broken follow-up query should not also stop customers
   * being told their subscription lapsed. Failures are captured per job and
   * reported in the response so the scheduler's logs show what happened.
   */
  async run(requested?: string[]): Promise<JobsRunSummary> {
    const now = new Date();
    const names = requested?.length ? requested : JOB_NAMES;

    const results: JobRunResult[] = [];

    for (const name of names) {
      const handler = JOB_HANDLERS[name];
      const startedAt = Date.now();

      if (!handler) {
        results.push({
          job: name,
          created: 0,
          skipped: 0,
          durationMs: 0,
          error: "Unknown job",
        });
        logger.warn("Unknown job requested", { job: name });
        continue;
      }

      try {
        const { created, skipped } = await handler(now);
        const durationMs = Date.now() - startedAt;

        results.push({ job: name, created, skipped, durationMs });

        logger.info("Job completed", { job: name, created, skipped, durationMs });
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        const message =
          error instanceof Error ? error.message : "Unknown error";

        results.push({
          job: name,
          created: 0,
          skipped: 0,
          durationMs,
          error: message,
        });

        logger.error("Job failed", { job: name, durationMs, error: message });
      }
    }

    return {
      ranAt: now.toISOString(),
      totalCreated: results.reduce((sum, result) => sum + result.created, 0),
      results,
    };
  },
};
