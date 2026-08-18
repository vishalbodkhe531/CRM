import { prisma } from "../config/db";
import { hashPassword } from "../utils/auth/password";
import { logger } from "../config/logger";
import { Role } from "@prisma/client";

/**
 * Super admin seed / break-glass recovery.
 *
 * There are deliberately NO hardcoded credential defaults. A fallback password
 * committed to the repository is a live vulnerability: it ships to production,
 * it is identical for every deployment, and anyone with read access to the
 * source has platform-wide admin. Both variables must be supplied by the
 * environment or this step does nothing.
 *
 * Recovery: super admins cannot reset their own password through the app
 * (there is no email transport, and resetUserPassword refuses self-service), so
 * this script is the break-glass path. Set SUPER_ADMIN_FORCE_RESET=true along
 * with SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD, then run `npm run seed`.
 * That resets the password and revokes every existing session for the account.
 */
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL?.trim();
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const FORCE_RESET = process.env.SUPER_ADMIN_FORCE_RESET === "true";

// ---------- Helpers ----------
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unknown error";
};

const getErrorCode = (error: unknown): string | undefined => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
};

const isTableMissingError = (error: unknown, tableName: string): boolean => {
  const code = getErrorCode(error);
  if (code === "42P01") return true;

  const message = getErrorMessage(error);
  return message.includes(`relation "${tableName}" does not exist`);
};

// ---------- Seed Super Admin ----------
export const seedSuperAdminUser = async () => {
  if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
    logger.info(
      "SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping super admin seed.",
    );
    return;
  }

  try {
    // Ensure User table exists
    await prisma.$queryRawUnsafe(`SELECT 1 FROM "User" LIMIT 1`);
  } catch (error) {
    if (isTableMissingError(error, "User")) {
      logger.warn(
        "Users table missing. Run `npx prisma migrate deploy` and restart.",
      );
      return;
    }

    logger.error("Could not verify User table for seed step", {
      error: getErrorMessage(error),
    });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: SUPER_ADMIN_EMAIL },
      select: { id: true, role: true },
    });

    if (existing) {
      if (!FORCE_RESET) {
        logger.info("Super Admin already exists. Skipping seed.");
        return;
      }

      if (existing.role !== Role.SUPER_ADMIN) {
        logger.error(
          "SUPER_ADMIN_FORCE_RESET refused: that email belongs to a non-super-admin account.",
        );
        return;
      }

      const hashedPassword = await hashPassword(SUPER_ADMIN_PASSWORD);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.id },
          data: {
            password: hashedPassword,
            // Invalidates every outstanding access token.
            passwordChangedAt: new Date(),
          },
        });
        // Access tokens die via passwordChangedAt; refresh tokens must go too,
        // or a stolen session could simply renew itself.
        await tx.refreshToken.deleteMany({ where: { userId: existing.id } });
      });

      logger.warn(
        `Super Admin password force-reset for ${SUPER_ADMIN_EMAIL}. All sessions revoked. Unset SUPER_ADMIN_FORCE_RESET now.`,
      );
      return;
    }

    const hashedPassword = await hashPassword(SUPER_ADMIN_PASSWORD);

    const superAdmin = await prisma.user.create({
      data: {
        role: Role.SUPER_ADMIN,
        firstName: "Super",
        lastName: "Admin",
        email: SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
      select: { id: true, email: true },
    });

    logger.info(`Super Admin seeded: ${superAdmin.email}`);
  } catch (error) {
    logger.error("Error seeding super admin user - server will still start.", {
      error: getErrorMessage(error),
    });
  }
};

/**
 * Allow `npm run seed` to actually execute.
 *
 * Without this the script only exported the function, so running it directly
 * was a silent no-op and the break-glass path above would never fire — seeding
 * only ever happened as a side effect of server startup.
 */
if (require.main === module) {
  seedSuperAdminUser()
    .catch((error) => {
      logger.error("Seed failed", { error: getErrorMessage(error) });
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
