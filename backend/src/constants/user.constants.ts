// ============================================================
// USER CONSTANTS
// Enum types for User come from @prisma/client (generated from user.prisma).
// Only non-Prisma logic (roles, cookies) is defined here.
// ============================================================
import { Role } from "@prisma/client";

// Re-export Prisma-generated types
export type { Role };

import { ROLES, UserRole } from "./roles";

export { ROLES };
export type { UserRole };

// ============================================================
// COOKIE CONFIG - runtime config, not a Prisma concept.
// ============================================================
export const COOKIE_CONFIG = {
  HTTP_ONLY: true,
  SAME_SITE: (process.env.NODE_ENV === "production" ? "none" : "lax") as
    | "none"
    | "lax",
  SECURE: process.env.NODE_ENV === "production",
  REFRESH_TOKEN_MAX_AGE: 7 * 24 * 60 * 60 * 1000,
} as const;
