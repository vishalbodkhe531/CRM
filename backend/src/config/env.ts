import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

type Duration = `${number}${"s" | "m" | "h" | "d"}`;

/** Type guard for JWT duration strings to avoid 'as' per project rules */
function isDuration(val: string): val is Duration {
  return /^\d+[smhd]$/.test(val);
}

// 1. The 'bootstrapper': cross-env sets NODE_ENV in package.json.
// 2. We use that to determine which .env file to load.
const nodeEnv = process.env.NODE_ENV || "development";
const envFile =
  nodeEnv === "production" ? ".env.production" : ".env.development";

// 3. Load the corresponding .env file into process.env.
dotenv.config({
  path: path.resolve(process.cwd(), envFile),
  // In local development, prefer the selected .env file over any stale shell vars.
  override: nodeEnv !== "production",
});

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL"),
  DIRECT_URL: z
    .string()
    .url("DIRECT_URL must be a valid PostgreSQL URL")
    .optional(),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long for security"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters long"),
  JWT_ACCESS_EXPIRY: z
    .string()
    .default("15m")
    .refine(isDuration, { message: "Invalid duration format" })
    .transform((val) => val), // already narrowed by refine
  JWT_REFRESH_EXPIRY: z
    .string()
    .default("7d")
    .refine(isDuration, { message: "Invalid duration format" })
    .transform((val) => val),
  SMTP_USER: z.string().trim().email().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().trim().default("CRM Support"),
  SMTP_FROM_ADDRESS: z.string().trim().email().optional(),
  RESEND_API_KEY: z.string().trim().optional(),
  RESEND_FROM_NAME: z.string().trim().default("CRM Support"),
  RESEND_FROM_ADDRESS: z.string().trim().default("onboarding@resend.dev"),
  /**
   * Shared secret for POST /api/v1/internal/jobs/run, called by the platform
   * scheduler (Render Cron / GitHub Actions).
   *
   * Optional so existing deployments keep booting, but the endpoint REFUSES
   * every request when it is unset — an unauthenticated job runner that anyone
   * on the internet can trigger is worse than no job runner. Minimum length is
   * enforced because this is the only thing standing in front of it.
   */
  INTERNAL_JOB_SECRET: z
    .string()
    .min(32, "INTERNAL_JOB_SECRET must be at least 32 characters")
    .optional(),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173")
    .transform((val) => val.split(",").map(o => o.trim()).filter(Boolean)),
});

export const env = envSchema.parse(process.env);
