/**
 * Type guard: checks if a value is a non-null object (Record).
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};
