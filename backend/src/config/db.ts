import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";

export type DB = PrismaClient | Prisma.TransactionClient;

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
