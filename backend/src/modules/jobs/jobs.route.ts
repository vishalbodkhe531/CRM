import { Router } from "express";
import express from "express";
import { jobsController } from "./jobs.controller";
import { requireInternalSecret } from "../../middlewares/internalAuth.middleware";

const router = Router();

/**
 * Internal machine-to-machine routes.
 *
 * Mounted in app.ts BEFORE csrfProtection and apiLimiter, which is what exempts
 * them: a scheduler sends no browser headers (so CSRF would 403 it) and a retry
 * burst looks like abuse to a rate limiter. Doing it by mount order rather than
 * by path-matching inside those middlewares keeps the exemption in one visible
 * place and stops it silently widening.
 *
 * Because it is mounted before the global express.json(), this router parses its
 * own body.
 */
router.use(express.json({ limit: "16kb" }));
router.use(requireInternalSecret);

router.get("/jobs", jobsController.listJobs);
router.post("/jobs/run", jobsController.runJobs);

export default router;
