import { z } from "zod";
import {
  ANNOUNCEMENT_PLACEMENTS,
  ANNOUNCEMENT_SCOPES,
  ANNOUNCEMENT_SEVERITIES,
} from "../types/announcement.types";
import { USER_ROLES } from "../constants/user.constants";

/**
 * Form-side schema for the announcement create/edit dialog.
 *
 * Dates are kept as the raw `datetime-local` strings the input produces and are
 * converted to ISO at submit time — binding a Date to that input fights the
 * browser's local-timezone formatting on every re-render.
 */

const SeverityEnum = z.enum(ANNOUNCEMENT_SEVERITIES);
const PlacementEnum = z.enum(ANNOUNCEMENT_PLACEMENTS);
const ScopeEnum = z.enum(ANNOUNCEMENT_SCOPES);
const RoleEnum = z.enum(USER_ROLES);

export const AnnouncementFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(150, "Title cannot exceed 150 characters"),
    body: z
      .string()
      .trim()
      .min(1, "Body is required")
      .max(5000, "Body cannot exceed 5000 characters"),
    severity: SeverityEnum,
    placement: PlacementEnum,
    scope: ScopeEnum,
    // No .default([]) here: a default makes the field optional on the schema's
    // INPUT type while staying required on its OUTPUT type, and react-hook-form's
    // resolver needs those two to agree. The dialog always supplies both.
    targetOrganizationIds: z.array(z.string()),
    targetRoles: z.array(RoleEnum),
    publishAt: z.string().optional().or(z.literal("")),
    expiresAt: z.string().optional().or(z.literal("")),
    dismissible: z.boolean(),
  })
  .refine(
    (value) =>
      !value.publishAt ||
      !value.expiresAt ||
      new Date(value.publishAt) < new Date(value.expiresAt),
    { message: "End time must be after start time", path: ["expiresAt"] },
  )
  .refine(
    (value) => !value.targetOrganizationIds.length || value.scope === "PLATFORM",
    {
      message: "Specific organizations can only be targeted by platform announcements",
      path: ["targetOrganizationIds"],
    },
  )
  .refine(
    (value) =>
      value.severity !== "CRITICAL" ||
      value.placement === "BANNER" ||
      value.placement === "BOTH",
    {
      message: "Critical announcements must show as a banner",
      path: ["placement"],
    },
  );

export type AnnouncementFormValues = z.infer<typeof AnnouncementFormSchema>;
