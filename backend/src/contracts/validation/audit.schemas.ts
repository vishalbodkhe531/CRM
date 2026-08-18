import { z } from "zod";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../constants/audit.constants";

const AuditActionEnum = z.enum(AUDIT_ACTIONS);
const AuditEntityTypeEnum = z.enum(AUDIT_ENTITY_TYPES);

/** Mirrors the query-array handling used by OrganizationFilterSchema. */
const parseQueryArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      typeof entry === "string"
        ? entry.split(",").map((part) => part.trim()).filter(Boolean)
        : [],
    );
  }

  if (typeof value === "string" && value.includes(",")) {
    return value.split(",").map((part) => part.trim()).filter(Boolean);
  }

  return value;
};

export const AuditLogFilterSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    action: z.preprocess(
      parseQueryArray,
      z.union([AuditActionEnum, z.array(AuditActionEnum)]).optional(),
    ),
    entityType: z.preprocess(
      parseQueryArray,
      z.union([AuditEntityTypeEnum, z.array(AuditEntityTypeEnum)]).optional(),
    ),
    entityId: z.string().trim().optional(),
    actorId: z.string().trim().optional(),
    /**
     * Super-admin only. Ignored for every other role, which is always forced to
     * its own organization in auditService.getAuditLogs.
     */
    organizationId: z.string().trim().optional(),
    createdFrom: z.coerce.date().optional(),
    // A date-only value ("2026-07-23") coerces to UTC midnight = the START of the
    // day, so `createdAt <= createdTo` would drop everything after 00:00. Push it
    // to the end of that day so the whole selected day is included. A value that
    // already carries a time is left as given.
    createdTo: z.coerce
      .date()
      .optional()
      .transform((value) => {
        if (!value) return value;
        const hasTimeComponent =
          value.getUTCHours() !== 0 ||
          value.getUTCMinutes() !== 0 ||
          value.getUTCSeconds() !== 0 ||
          value.getUTCMilliseconds() !== 0;
        if (hasTimeComponent) return value;
        const endOfDay = new Date(value);
        endOfDay.setUTCHours(23, 59, 59, 999);
        return endOfDay;
      }),
  })
  .refine(
    (value) =>
      !value.createdFrom ||
      !value.createdTo ||
      value.createdFrom <= value.createdTo,
    { message: "createdFrom must be before createdTo", path: ["createdFrom"] },
  );

export type AuditLogFilterInput = z.infer<typeof AuditLogFilterSchema>;
