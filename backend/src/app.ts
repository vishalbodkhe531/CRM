import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { prisma } from "./config/db";
import { env } from "./config/env";
import { morganStream } from "./config/logger";
import { csrfProtection } from "./middlewares/csrf.middleware";
import { errorHandler } from "./middlewares/errorHandler";
import { apiLimiter } from "./middlewares/rateLimiter";
import { cleanupUploadsOnError } from "./middlewares/uploadCleanup.middleware";
import announcementRoutes from "./modules/announcement/announcement.route";
import auditRoutes from "./modules/audit/audit.route";
import authroutes from "./modules/auth/auth.route";
import billingRoutes from "./modules/billing/billing.route";
import dashboardRoutes from "./modules/dashboard/dashboard.route";
import itemRoutes from "./modules/item/item.route";
import internalRoutes from "./modules/jobs/jobs.route";
import leadRoutes from "./modules/lead/lead.route";
import notificationRoutes from "./modules/notification/notification.route";
import organizationRoutes from "./modules/organization/organization.route";
import platformSettingsRoutes from "./modules/platformSettings/platformSettings.route";
import prospectRoutes from "./modules/prospect/prospect.route";
import quotationRoutes from "./modules/quotation/quotation.route";
import reportsRoutes from "./modules/reports/reports.route";
import { signupRequestRoutes } from "./modules/signupRequest/signupRequest.route";
import userRoutes from "./modules/user/user.route";
import { ApiResponse } from "./utils/response/response";
import client from "prom-client";

const app = express();
const isDevelopment = env.NODE_ENV !== "production";
const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics({
  eventLoopMonitoringPrecision: 5000,
});

app.set("trust proxy", 1);

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

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.use(
  morgan(isDevelopment ? "dev" : "combined", {
    stream: morganStream,
  }),
);

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use("/uploads", (_req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/v1/internal", internalRoutes);
app.use(csrfProtection);
app.use(apiLimiter);
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
app.use(cleanupUploadsOnError);
app.use(errorHandler);

export default app;
