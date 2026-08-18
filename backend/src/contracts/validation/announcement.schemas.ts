import { z } from "zod";
import {
  ANNOUNCEMENT_PLACEMENTS,
  ANNOUNCEMENT_SEVERITIES,
  ANNOUNCEMENT_SCOPES,
  ANNOUNCEMENT_STATUSES,
} from "../constants/announcement.constants";
import { USER_ROLES } from "../constants/user.constants";

const ScopeEnum = z.enum(ANNOUNCEMENT_SCOPES);
const SeverityEnum = z.enum(ANNOUNCEMENT_SEVERITIES);
const StatusEnum = z.enum(ANNOUNCEMENT_STATUSES);
const PlacementEnum = z.enum(ANNOUNCEMENT_PLACEMENTS);
const RoleEnum = z.enum(USER_ROLES);

/** Mirrors the query-array handling used by AuditLogFilterSchema. */
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

/**
 * Cross-field rules shared by create and update.
 *
 * These live here rather than in the service because they are properties of a
 * well-formed payload, not business decisions. Ownership and scope authority
 * (can THIS actor write a PLATFORM announcement?) stay in the service — the
 * schema has no idea who is calling.
 */
const withCrossFieldRules = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .refine(
      (value: any) =>
        !value.publishAt ||
        !value.expiresAt ||
        value.publishAt < value.expiresAt,
      {
        message: "expiresAt must be after publishAt",
        path: ["expiresAt"],
      },
    )
    .refine(
      (value: any) =>
        !value.targetOrganizationIds?.length || value.scope === "PLATFORM",
      {
        message: "targetOrganizationIds is only valid for PLATFORM announcements",
        path: ["targetOrganizationIds"],
      },
    )
    .refine(
      (value: any) =>
        value.severity !== "CRITICAL" ||
        value.placement === undefined ||
        value.placement === "BANNER" ||
        value.placement === "BOTH",
      {
        // A critical notice that only appears in a dropdown is not a critical notice.
        message: "CRITICAL announcements must use BANNER or BOTH placement",
        path: ["placement"],
      },
    );

const announcementBody = {
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
  body: z.string().trim().min(1, "Body is required").max(5000),
  severity: SeverityEnum.default("INFO"),
  placement: PlacementEnum.default("BELL"),
  /**
   * Super-admin only. An ADMIN sending PLATFORM is rejected outright by the
   * service rather than downgraded — a silent downgrade means the author
   * believes they broadcast platform-wide when they did not.
   */
  scope: ScopeEnum.default("ORGANIZATION"),
  targetOrganizationIds: z.array(z.string().uuid()).default([]),
  targetRoles: z.array(RoleEnum).default([]),
  publishAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  dismissible: z.boolean().default(true),
};

export const CreateAnnouncementSchema = withCrossFieldRules(
  z.object(announcementBody),
);

export const UpdateAnnouncementSchema = withCrossFieldRules(
  z
    .object({
      ...announcementBody,
      severity: SeverityEnum.optional(),
      placement: PlacementEnum.optional(),
      scope: ScopeEnum.optional(),
      targetOrganizationIds: z.array(z.string().uuid()).optional(),
      targetRoles: z.array(RoleEnum).optional(),
      dismissible: z.boolean().optional(),
      title: announcementBody.title.optional(),
      body: announcementBody.body.optional(),
    })
    .partial(),
);

/** Management-list filters. */
export const AnnouncementFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.preprocess(
    parseQueryArray,
    z.union([StatusEnum, z.array(StatusEnum)]).optional(),
  ),
  scope: z.preprocess(
    parseQueryArray,
    z.union([ScopeEnum, z.array(ScopeEnum)]).optional(),
  ),
  severity: z.preprocess(
    parseQueryArray,
    z.union([SeverityEnum, z.array(SeverityEnum)]).optional(),
  ),
  /** Super-admin only; every other role is pinned to its own organization. */
  organizationId: z.string().trim().optional(),
});

/** Viewer-feed query. */
export const AnnouncementFeedSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  /** When true, dismissed announcements are included (the "View all" history). */
  includeDismissed: z.coerce.boolean().default(false),
});

export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;
export type AnnouncementFilterInput = z.infer<typeof AnnouncementFilterSchema>;
export type AnnouncementFeedInput = z.infer<typeof AnnouncementFeedSchema>;
