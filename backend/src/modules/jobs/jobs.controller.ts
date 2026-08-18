import { Request, Response } from "express";
import { jobsService, JOB_NAMES } from "./jobs.service";
import { ApiResponse } from "../../utils/response/response";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { logger } from "../../config/logger";
import { RunJobsSchema } from "../../contracts/validation";

/**
 * Internal jobs controller.
 *
 * Called by the platform scheduler, never by a browser. Authenticated by shared
 * secret in requireInternalSecret — there is no user on these requests.
 */

// POST /internal/jobs/run - Run scheduled jobs
const runJobs = asyncHandler(async (req: Request, res: Response) => {
  const { jobs } = RunJobsSchema.parse(req.body ?? {});

  const summary = await jobsService.run(jobs);

  logger.info("Scheduled jobs run", {
    requested: jobs ?? "all",
    totalCreated: summary.totalCreated,
  });

  /*
   * Always 200, even when an individual job failed.
   *
   * A non-2xx makes most schedulers retry, and retrying a run in which three of
   * four jobs succeeded just re-does the work. The per-job `error` field is the
   * signal to alert on; the HTTP status only reports that the runner itself is
   * alive.
   */
  return ApiResponse.ok(res, summary, "Jobs completed");
});

// GET /internal/jobs - List runnable jobs (useful when configuring a scheduler)
const listJobs = asyncHandler(async (_req: Request, res: Response) => {
  return ApiResponse.ok(res, { jobs: JOB_NAMES }, "Jobs retrieved");
});

export const jobsController = {
  runJobs,
  listJobs,
};
