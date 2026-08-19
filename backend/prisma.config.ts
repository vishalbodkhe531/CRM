import { defineConfig } from "prisma/config";
import dotenv from "dotenv";
import path from "path";

// Load local env files if present for CLI commands
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
dotenv.config();

const dbUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/postgres";

/**
 * CLI-only configuration.
 *
 * The runtime client does NOT read this file — src/config/db.ts builds its own
 * pg Pool from DATABASE_URL and hands it to PrismaClient through the adapter.
 * Everything here therefore affects `prisma migrate`, `prisma studio` and
 * `prisma db pull` only.
 */
export default defineConfig({
  schema: "./prisma",
  datasource: {
    url: dbUrl,
  },
});

