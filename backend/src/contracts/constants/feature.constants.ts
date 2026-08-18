/**
 * Feature catalogue.
 *
 * THE KEYS LIVE IN CODE. THE VALUES LIVE IN THE DATABASE.
 *
 * A feature key is referenced by enforcement code throughout the application, so
 * it must not be editable by an operator — renaming one from a UI would silently
 * unhook whatever enforces it. What a super-admin *can* change is every plan's
 * value for a key: limits, toggles, pricing and packaging are data.
 *
 * Deliberately a String column constrained by this union rather than a Prisma
 * enum, matching AuditLog.action and Notification.type: adding a feature must
 * not require a database migration, which is exactly the friction that pushes
 * people back towards hard-coded columns.
 *
 * ⚠️ ONLY ADD A KEY WHEN THE FEATURE EXISTS. A plan advertising a limit nothing
 * measures, or a toggle nothing reads, is a promise the product cannot keep —
 * that is precisely how the old `storageLimitMb` column ended up meaningless.
 */

export const FEATURE_KEYS = [
  // Limits
  "MAX_USERS",
  "MAX_LEADS",
  "MAX_PROSPECTS",
  "MAX_QUOTATIONS",
  "MAX_ITEMS",

  // Toggles
  "AUDIT_LOG_ACCESS",
  "ANNOUNCEMENTS",
  "QUOTATION_PDF",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** A limit holds a number (null = unlimited); a toggle holds a boolean. */
export type FeatureKind = "limit" | "toggle";

export interface FeatureDefinition {
  key: FeatureKey;
  kind: FeatureKind;
  label: string;
  description: string;
  /**
   * True when the application actually refuses the action on breach.
   * False means the number is reported on the usage screen but nothing stops
   * anyone exceeding it — an honest distinction the plans console shows, so
   * nobody sells a limit that is decorative.
   */
  enforced: boolean;
  /** Applied when neither an override nor a plan row exists. */
  defaultValue: number | boolean | null;
}

export const FEATURE_DEFINITIONS: Record<FeatureKey, FeatureDefinition> = {
  MAX_USERS: {
    key: "MAX_USERS",
    kind: "limit",
    label: "Users",
    description:
      "Active user accounts. Disabling a user frees their seat and keeps their history.",
    enforced: true,
    defaultValue: null,
  },
  MAX_LEADS: {
    key: "MAX_LEADS",
    kind: "limit",
    label: "Leads",
    description: "Total leads that can be created.",
    // Enforced in leadService.createLead and the import path via assertWithinLimit.
    enforced: true,
    defaultValue: null,
  },
  MAX_PROSPECTS: {
    key: "MAX_PROSPECTS",
    kind: "limit",
    label: "Prospects",
    description: "Total prospects in the pipeline.",
    // Enforced in prospectService.convertLeadToProspect via assertWithinLimit.
    enforced: true,
    defaultValue: null,
  },
  MAX_QUOTATIONS: {
    key: "MAX_QUOTATIONS",
    kind: "limit",
    label: "Quotations",
    description: "Total quotations that can be raised.",
    // Enforced in quotationService.createQuotation via assertWithinLimit.
    enforced: true,
    defaultValue: null,
  },
  MAX_ITEMS: {
    key: "MAX_ITEMS",
    kind: "limit",
    label: "Items",
    description: "Products and services in the catalogue.",
    // Enforced in itemService.createItem via assertWithinLimit.
    enforced: true,
    defaultValue: null,
  },
  AUDIT_LOG_ACCESS: {
    key: "AUDIT_LOG_ACCESS",
    kind: "toggle",
    label: "Audit log",
    description: "Access to the organization's activity trail.",
    // Enforced by requireFeature on the audit read route.
    enforced: true,
    defaultValue: true,
  },
  ANNOUNCEMENTS: {
    key: "ANNOUNCEMENTS",
    kind: "toggle",
    label: "Announcements",
    description: "Broadcast messages to everyone in the organization.",
    // Enforced by requireFeature on the announcement authoring routes.
    enforced: true,
    defaultValue: true,
  },
  QUOTATION_PDF: {
    key: "QUOTATION_PDF",
    kind: "toggle",
    label: "Quotation PDF",
    description: "Download and share quotations as PDF.",
    // UI-gated only: the PDF is rendered client-side (pdfPreview.ts), so there is
    // no server action to refuse. Honestly stays false until PDF generation moves
    // server-side — marking it enforced would advertise a wall that isn't there.
    enforced: false,
    defaultValue: true,
  },
};

export const LIMIT_FEATURE_KEYS = FEATURE_KEYS.filter(
  (key) => FEATURE_DEFINITIONS[key].kind === "limit",
);

export const TOGGLE_FEATURE_KEYS = FEATURE_KEYS.filter(
  (key) => FEATURE_DEFINITIONS[key].kind === "toggle",
);

/*
 * There is deliberately no ENFORCED_FEATURE_KEYS aggregate. The plan console
 * needs to know whether a SPECIFIC feature is enforced, and it reads
 * `enforced` off the per-feature payload built from FEATURE_DEFINITIONS — a
 * separate pre-filtered array was never consulted and had drifted out of use.
 */
