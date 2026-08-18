import { Prisma } from "@prisma/client";

/**
 * typeGuards.ts - Helper functions to identify specific error types
 */

/**
 * Checks if an error is a Prisma Unique Constraint violation (P2002)
 */
export const isPrismaUniqueError = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};
