import { parseOptionalDate } from "../../utils/validation";
import type { Lead } from "../../contracts/types";

// ---------------------------------------------------------------------------
// Case-insensitive cell value extraction
// ---------------------------------------------------------------------------

/**
 * Retrieves a cell value from a row by column header name.
 * Performs an exact-key lookup first, then falls back to a
 * case-insensitive + trimmed match so that headers like
 * "first name", "First name", "FIRST NAME" all resolve.
 */
export const getCellString = (
  row: Record<string, unknown>,
  key: string,
): string | undefined => {
  // 1. Fast path — exact key match
  let value = row[key];

  // 2. Slow path — case-insensitive lookup
  if (value === undefined || value === null) {
    const lowerKey = key.toLowerCase().trim();
    const matchingKey = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === lowerKey,
    );
    if (matchingKey) value = row[matchingKey];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  return undefined;
};

// ---------------------------------------------------------------------------
// Mobile number helper — handles Excel numeric formatting
// ---------------------------------------------------------------------------

/**
 * Extracts a mobile number from a cell, handling:
 * - Numbers stored as Excel numeric (leading zeros stripped)
 * - Values with country codes like +91, 91-, etc.
 * - Values with spaces, dashes, parentheses
 */
export const getMobileString = (
  row: Record<string, unknown>,
  key: string,
): string | undefined => {
  const raw = getCellString(row, key);
  if (!raw) return undefined;

  // Strip all non-digit characters
  let digits = raw.replace(/[^0-9]/g, "");

  if (digits.length === 0) return undefined;

  // If the number starts with country code 91 and is 12 digits, strip the code
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  // If 9 digits, pad with leading zero (Excel strips leading zeros)
  if (digits.length === 9) {
    digits = "0" + digits;
  }

  return digits.length > 0 ? digits : undefined;
};

// ---------------------------------------------------------------------------
// Enum mapping dictionaries
// ---------------------------------------------------------------------------
// Keys are UPPERCASED lookup values. Values are the exact enum constants
// accepted by the Zod schemas.

export const SOURCE_MAP: Record<string, string> = {
  // Direct enum values
  COLD_CALL: "COLD_CALL",
  EMAIL: "EMAIL",
  REFERENCE: "REFERENCE",
  SOCIAL_MEDIA: "SOCIAL_MEDIA",
  WEBSITE: "WEBSITE",
  ADVERTISE: "ADVERTISE",
  GOOGLE_ADS: "GOOGLE_ADS",
  EVENT: "EVENT",
  TRADE_SHOW: "TRADE_SHOW",
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  LINKEDIN: "LINKEDIN",
  OTHER: "OTHER",

  // Human-readable / common variants
  "COLD CALL": "COLD_CALL",
  COLDCALL: "COLD_CALL",
  "SOCIAL MEDIA": "SOCIAL_MEDIA",
  SOCIALMEDIA: "SOCIAL_MEDIA",
  WEB: "WEBSITE",
  SITE: "WEBSITE",
  ADVERTISEMENT: "ADVERTISE",
  ADS: "ADVERTISE",
  AD: "ADVERTISE",
  "GOOGLE ADS": "GOOGLE_ADS",
  GOOGLEADS: "GOOGLE_ADS",
  "TRADE SHOW": "TRADE_SHOW",
  TRADESHOW: "TRADE_SHOW",
  FB: "FACEBOOK",
  INSTA: "INSTAGRAM",
  REFERRAL: "REFERENCE",
  REF: "REFERENCE",
};

export const INDUSTRY_MAP: Record<string, string> = {
  // Direct enum values
  IT: "IT",
  BANKING: "BANKING",
  BANKING_FINANCE: "BANKING_FINANCE",
  EDUCATION: "EDUCATION",
  MANUFACTURING: "MANUFACTURING",
  HEALTHCARE: "HEALTHCARE",
  REAL_ESTATE: "REAL_ESTATE",
  RETAIL: "RETAIL",
  ECOMMERCE: "ECOMMERCE",
  AUTOMOBILE: "AUTOMOBILE",
  CONSTRUCTION: "CONSTRUCTION",
  TRAVEL_TOURISM: "TRAVEL_TOURISM",
  MEDIA_ENTERTAINMENT: "MEDIA_ENTERTAINMENT",
  OTHER: "OTHER",

  // Human-readable / common variants
  "INFORMATION TECHNOLOGY": "IT",
  INFORMATION_TECHNOLOGY: "IT",
  TECH: "IT",
  TECHNOLOGY: "IT",
  SOFTWARE: "IT",
  "BANKING & FINANCE": "BANKING_FINANCE",
  "BANKING AND FINANCE": "BANKING_FINANCE",
  "BANKING FINANCE": "BANKING_FINANCE",
  FINANCE: "BANKING_FINANCE",
  FINANCIAL: "BANKING_FINANCE",
  EDU: "EDUCATION",
  "HEALTH CARE": "HEALTHCARE",
  HEALTH_CARE: "HEALTHCARE",
  MEDICAL: "HEALTHCARE",
  PHARMA: "HEALTHCARE",
  "REAL ESTATE": "REAL_ESTATE",
  REALESTATE: "REAL_ESTATE",
  PROPERTY: "REAL_ESTATE",
  "E-COMMERCE": "ECOMMERCE",
  E_COMMERCE: "ECOMMERCE",
  "E COMMERCE": "ECOMMERCE",
  ONLINE: "ECOMMERCE",
  AUTO: "AUTOMOBILE",
  AUTOMOTIVE: "AUTOMOBILE",
  CARS: "AUTOMOBILE",
  "TRAVEL & TOURISM": "TRAVEL_TOURISM",
  "TRAVEL AND TOURISM": "TRAVEL_TOURISM",
  "TRAVEL TOURISM": "TRAVEL_TOURISM",
  TRAVEL: "TRAVEL_TOURISM",
  TOURISM: "TRAVEL_TOURISM",
  "TRAVEL/TOURISM": "TRAVEL_TOURISM",
  "MEDIA & ENTERTAINMENT": "MEDIA_ENTERTAINMENT",
  "MEDIA AND ENTERTAINMENT": "MEDIA_ENTERTAINMENT",
  "MEDIA ENTERTAINMENT": "MEDIA_ENTERTAINMENT",
  MEDIA: "MEDIA_ENTERTAINMENT",
  ENTERTAINMENT: "MEDIA_ENTERTAINMENT",
};

export const LEAD_TYPE_MAP: Record<string, string> = {
  NEW: "NEW",
  EXISTING: "EXISTING",
  // Common variants
  OLD: "EXISTING",
  CURRENT: "EXISTING",
  FRESH: "NEW",
};

// ---------------------------------------------------------------------------
// Enum normalization with mapping
// ---------------------------------------------------------------------------

/**
 * Normalizes a raw cell value into a valid enum constant using an explicit
 * mapping dictionary. Returns `undefined` when the cell is empty OR when
 * the value cannot be resolved — so Zod's `.optional().nullable()` accepts it
 * instead of throwing an "Invalid option" error.
 */
export const normalizeEnumWithMap = (
  row: Record<string, unknown>,
  key: string,
  enumMap: Record<string, string>,
): string | undefined => {
  const raw = getCellString(row, key);
  if (!raw) return undefined;

  // Normalize: uppercase, collapse whitespace, trim
  const normalized = raw.toUpperCase().replace(/\s+/g, " ").trim();

  // 1. Try direct map lookup
  if (enumMap[normalized] !== undefined) {
    return enumMap[normalized];
  }

  // 2. Try after replacing spaces and special chars with underscores
  const underscored = normalized
    .replace(/[&\/\\]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (enumMap[underscored] !== undefined) {
    return enumMap[underscored];
  }

  // 3. Try stripped version (remove all non-alphanumeric)
  const stripped = normalized.replace(/[^A-Z0-9]/g, "");
  if (enumMap[stripped] !== undefined) {
    return enumMap[stripped];
  }

  // Could not resolve — return undefined so the optional field passes validation
  return undefined;
};

// ---------------------------------------------------------------------------
// Lead DTO mapping (unchanged)
// ---------------------------------------------------------------------------

type LeadRecord = {
  id: string;
  leadNo: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  mobile: string | null;
  alternateMobile: string | null;
  companyName: string | null;
  gstin: string | null;
  email: string | null;
  website: string | null;
  linkedInProfile: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  source: Lead["source"];
  industry: Lead["industry"];
  customIndustry: string | null;
  leadType: Lead["leadType"];
  status: Lead["status"];
  productInterestId: string | null;
  productInterest?: Lead["productInterest"];
  requiredDescription: string | null;
  assignedToId: string | null;
  assignedTo?: Lead["assignedTo"];
  convertedAt: Date | null;
  convertedById: string | null;
  createdAt: Date;
  deletedAt?: Date | null;
  prospect?: { id: string; deletedAt?: Date | null } | null;
};

export const toLeadDTO = (lead: LeadRecord): Lead => {
  const { productInterestId, convertedAt, createdAt, ...rest } = lead;
  return {
    ...rest,
    convertedAt: convertedAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    productInterested: productInterestId,
    isActive: !lead.deletedAt,
    isConverted: !!lead.prospect?.id && !lead.prospect.deletedAt,
  };
};

// ---------------------------------------------------------------------------
// Date cell extraction & validation helper
// ---------------------------------------------------------------------------

/**
 * Extracts and validates a Date value from an Excel/CSV cell by column key.
 * Returns Date if valid, undefined if empty/missing.
 * Throws an error if an explicit invalid date value is provided.
 */
export const getDateCell = (
  row: Record<string, unknown>,
  key: string,
): Date | undefined => {
  let val = row[key];

  if (val === undefined || val === null || val === "") {
    const lowerKey = key.toLowerCase().trim();
    const matchingKey = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === lowerKey,
    );
    if (matchingKey) val = row[matchingKey];
  }

  if (val === undefined || val === null || val === "") return undefined;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }

  if (typeof val === "number") {
    // Excel date serial number (e.g. 45000)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date;
    throw new Error(`Invalid Excel numeric date: ${val}`);
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return undefined;

    // Standard YYYY-MM-DD or YYYY/MM/DD
    const yyyymmdd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      const [, y, m, d] = yyyymmdd;
      const parsed = new Date(Date.UTC(+y, +m - 1, +d));
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      const parsed = new Date(Date.UTC(+y, +m - 1, +d));
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;

    throw new Error(`Invalid Date: "${val}". Please use YYYY-MM-DD or DD-MM-YYYY format.`);
  }

  throw new Error(`Invalid Date value provided.`);
};

export { parseOptionalDate };
