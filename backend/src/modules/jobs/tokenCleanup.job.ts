import { authRepository } from "../auth/auth.repository";
import { logger } from "../../config/logger";

/**
 * Periodically removes expired refresh tokens from the database.
 *
 * Started from src/index.ts at boot on a setInterval, and deliberately NOT
 * registered in JOB_HANDLERS. The registry there is HTTP-triggered precisely so
 * a job fires once across all replicas — but this one only deletes rows that are
 * already expired, so running it per replica is idempotent and harmless, and an
 * in-process timer means it cannot be forgotten by whoever configures the
 * scheduler.
 *
 * Moving it into the registry would be tidier, but only once the external
 * scheduler is reliably calling /internal/jobs/run — otherwise expired tokens
 * would silently accumulate forever.
 */
export const startTokenCleanupJob = (intervalMs: number = 1000 * 60 * 60 * 6) => {
  logger.info("Starting token cleanup job", { intervalMs });

  const runCleanup = async () => {
    try {
      const [refreshResult, passwordResetOtpResult] = await Promise.all([
        authRepository.deleteOldTokens(),
        authRepository.deleteOldPasswordResetOtps(),
      ]);

      if (refreshResult.count > 0 || passwordResetOtpResult.count > 0) {
        logger.info("Old/expired tokens cleaned up", {
          refreshTokens: refreshResult.count,
          passwordResetOtps: passwordResetOtpResult.count,
        });
      }
    } catch (error) {
      logger.error("Token cleanup job failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Run immediately on start
  runCleanup();

  // Then run on interval
  return setInterval(runCleanup, intervalMs);
};
