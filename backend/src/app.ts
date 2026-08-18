import express from "express";
import path from "path";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { env } from "./config/env";
import { morganStream } from "./config/logger";
import { errorHandler } from "./middlewares/errorHandler";
import { cleanupUploadsOnError } from "./middlewares/uploadCleanup.middleware";
import { ApiResponse } from "./utils/response/response";
import { prisma } from "./config/db";
import authroutes from "./modules/auth/auth.route";
import userRoutes from "./modules/user/user.route";
import dashboardRoutes from "./modules/dashboard/dashboard.route";
import itemRoutes from "./modules/item/item.route";
import leadRoutes from "./modules/lead/lead.route";
import organizationRoutes from "./modules/organization/organization.route";
import prospectRoutes from "./modules/prospect/prospect.route";
import quotationRoutes from "./modules/quotation/quotation.route";
import reportsRoutes from "./modules/reports/reports.route";
import auditRoutes from "./modules/audit/audit.route";
import announcementRoutes from "./modules/announcement/announcement.route";
import billingRoutes from "./modules/billing/billing.route";
import notificationRoutes from "./modules/notification/notification.route";
import platformSettingsRoutes from "./modules/platformSettings/platformSettings.route";
import internalRoutes from "./modules/jobs/jobs.route";
import { signupRequestRoutes } from "./modules/signupRequest/signupRequest.route";
import { apiLimiter } from "./middlewares/rateLimiter";
import { csrfProtection } from "./middlewares/csrf.middleware";

const app = express();
const isDevelopment = env.NODE_ENV !== "production";

/**
 * 🔐 Trust reverse proxy (Render, Fly.io, Nginx, Cloudflare)
 */
app.set("trust proxy", 1);

/**
 * ❤️ Health check (no middleware overhead)
 */
app.get("/health", async (_req, res) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - start;

    ApiResponse.ok(
      res,
      { status: "ok", db: "connected", dbLatencyMs, timestamp: new Date().toISOString() },
      "Health check ok",
    );
  } catch (error) {
    ApiResponse.error(
      res,
      503,
      "Database connection failed",
      [error instanceof Error ? error.message : "Unknown error"]
    );
  }
});

/**
 * 🪵 1. Request Logging (MUST BE FIRST)
 * Morgan → Winston (single source of truth)
 */
app.use(
  morgan(isDevelopment ? "dev" : "combined", {
    stream: morganStream,
  }),
);

/**
 * 🛡️ 3. Security Headers
 */
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

/**
 * ⚡ 4. Performance & Parsers
 */
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));

/**
 * 🌍 5. CORS
 */
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

/**
 * 🖼️ Static Files — serve uploaded profile pictures
 * Must be BEFORE CSRF and rate limiter so static assets are not blocked.
 * Override helmet's Cross-Origin-Resource-Policy: same-origin header so the
 * browser can load images cross-origin (frontend on :5173, backend on :5000).
 *
 * ── Serving these unauthenticated is a deliberate decision ──────────────────
 * The directory holds organization logos, QR codes, signatures and profile
 * images. Logos, QR codes and signatures are embedded in generated quotation
 * PDFs and outgoing email, which cannot carry a Bearer token — gating them
 * would mean a signed-URL scheme, which is not worth it for branding assets.
 *
 * What this accepts: anyone holding a URL can read that asset, forever, with no
 * tenant check. What it relies on: filenames carry ~30 bits of randomness
 * (`<prefix>-<epoch-ms>-<rand 1e9>.<ext>`) and are never listed, so the URL is
 * the capability. Directory listing is off by default in express.static.
 *
 * Revisit if signatures become legally operative (e-signature, contracts) or if
 * anything genuinely confidential is ever written here — at that point move to
 * private storage with signed URLs rather than bolting auth onto this mount.
 */
app.use("/uploads", (_req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/**
 * 🤖 Internal machine-to-machine routes (BEFORE csrf + rate limiting)
 *
 * The platform scheduler calls these on a timer. It sends no browser headers,
 * so csrfProtection would reject it, and a retry burst would trip apiLimiter.
 * Mounting above those two is what exempts it — deliberately expressed as
 * ordering rather than as a path check inside those middlewares, so the
 * exemption stays in one visible place.
 *
 * Not unprotected: requireInternalSecret guards every route with a timing-safe
 * shared-secret comparison and fails closed when the secret is unconfigured.
 */
app.use("/api/v1/internal", internalRoutes);

/**
 * 🔒 6. Security Middlewares (AFTER logging)
 */
app.use(csrfProtection);
app.use(apiLimiter);

/**
 * 🧭 7. Routes
 */
/**
 * Subscription enforcement is applied INSIDE the tenant-data routers
 * (users, items, leads, prospects, quotations), immediately after their
 * requireAuth — it needs req.user, which is only populated there.
 *
 * Not enforced anywhere below: auth, dashboard, reports, organizations,
 * audit-logs and announcements. A lapsed tenant must still be able to log in,
 * see where they stand, and reach the page where they can pay.
 */
app.use("/api/v1/auth", authroutes);
app.use("/api/v1/signup-requests", signupRequestRoutes.publicRouter);
app.use("/api/v1/admin/signup-requests", signupRequestRoutes.adminRouter);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/items", itemRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/prospects", prospectRoutes);
app.use("/api/v1/quotations", quotationRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/audit-logs", auditRoutes);
app.use("/api/v1/announcements", announcementRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/platform-settings", platformSettingsRoutes);


/**
 * 🧹 Discard files multer wrote for a request that then failed. Must sit
 * immediately before the error handler so it sees every failing request.
 */
app.use(cleanupUploadsOnError);

/**
 * ❌ 8. Global Error Handler (ALWAYS LAST)
 */
app.use(errorHandler);

export default app;
