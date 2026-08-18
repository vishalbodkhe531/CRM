import { Role } from "@prisma/client";

export const ROLES = {
  SUPER_ADMIN: Role.SUPER_ADMIN,
  ADMIN: Role.ADMIN,
  MANAGER: Role.MANAGER,
  EXECUTIVE: Role.EXECUTIVE,
} as const satisfies Record<string, Role>;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
