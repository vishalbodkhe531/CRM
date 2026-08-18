// ============================================================
// LEAD CONSTANTS
// Standardized constants for Lead module ensuring Zero-Cast compliance.
// ============================================================
import { LeadSource, LeadType, LeadStatus, Industry } from "@prisma/client";

// Re-export Prisma-generated types
export type { LeadSource, LeadType, LeadStatus, Industry };

// Runtime array for Zod validation - using Prisma exports directly.
// Only statuses need one: the schemas validate source/industry/leadType straight
// off the Prisma enums, so equivalent arrays for those went unused.
export const AVAILABLE_LEAD_STATUSES = Object.values(LeadStatus) as [LeadStatus, ...LeadStatus[]];
