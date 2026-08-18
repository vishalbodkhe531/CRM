/**
 * Normalizes specific fields by converting empty strings or whitespace-only strings to undefined.
 * Used to bridge the gap between HTML form inputs (which always return strings) and
 * strict Zod schemas that expect undefined for optional fields.
 *
 * @param obj The object containing data to normalize.
 * @param optionalKeys Explicit list of keys to normalize if they are empty strings.
 * @returns A new object with normalized fields.
 */
export function normalizeOptionalFields<T extends object>(
  obj: T,
  optionalKeys: (keyof T)[]
): T {
  const result = { ...obj };

  optionalKeys.forEach((key) => {
    const value = result[key];

    // Only transform if it's a string and is empty or whitespace-only
    if (typeof value === 'string' && value.trim() === '') {
      result[key] = undefined as unknown as T[keyof T];
    }
  });

  return result;
}
