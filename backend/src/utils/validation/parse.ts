import { AppError } from "../errors/appError";

/**
 * Functional date parser (no opinion on field names).
 * Returns Date or undefined. Throws AppError only on malformed strings.
 */
export const parseOptionalDate = (value?: string | null): Date | undefined => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw AppError.validation.badRequest("Invalid date format");
  }

  return date;
};
