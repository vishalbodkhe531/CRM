import { env } from "./config/env";
import app from "./app";
import { prisma } from "./config/db";
import { logger } from "./config/logger";
import { seedSuperAdminUser } from "./scripts/seedSuperAdmin";
import { startTokenCleanupJob } from "./modules/jobs/tokenCleanup.job";

const PORT = Number(env.PORT) || 5000;

const isSupabaseDirectConnection = (databaseUrl: string): boolean => {
  try {
    const parsed = new URL(databaseUrl);
    return (
      parsed.protocol.startsWith("postgres") &&
      parsed.hostname.endsWith(".supabase.co") &&
      parsed.hostname.startsWith("db.") &&
      parsed.port === "5432"
    );
  } catch {
    return false;
  }
};

const getStartupHint = (error: unknown): string | undefined => {
  const message = error instanceof Error ? error.message : String(error);

  if (!message.includes("Can't reach database server")) {
    return undefined;
  }

  if (isSupabaseDirectConnection(env.DATABASE_URL)) {
    return [
      "DATABASE_URL is using Supabase's direct host on port 5432.",
      "That route is IPv6 by default, so IPv4-only networks cannot reach it.",
      "Open Supabase Dashboard > Connect and copy the Supavisor Session pooler string into DATABASE_URL.",
      "Set DIRECT_URL to the direct connection string for Prisma CLI commands such as prisma migrate.",
      "If you need the direct host from an IPv4-only network, enable Supabase's IPv4 add-on.",
    ].join(" ");
  }

  return "Check DATABASE_URL, database availability, and network access from this machine.";
};

const start = async () => {
  try {
    //Ensure DB is reachable
    await prisma.$queryRawUnsafe("SELECT 1");
    logger.info("Database connected");

    //Seed (safe - idempotent)
    await seedSuperAdminUser();

    //Start Token Cleanup (Every 6 hours)
    const cleanupInterval = startTokenCleanupJob();

    //Start server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
      // logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
    });

    //Graceful shutdown (simple version)
    const shutdown = async () => {
      logger.info("Shutting down...");
      clearInterval(cleanupInterval);
      await prisma.$disconnect();
      server.close(() => process.exit(0));
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const hint = getStartupHint(error);

    logger.error("Startup failed", {
      error: errorMessage,
      ...(hint ? { hint } : {}),
    });
    process.exit(1);
  }
};

start();
