/**
 * Fallback product name.
 *
 * Used before the settings query resolves, and on the login screen, which is
 * unauthenticated and so cannot read platform settings at all.
 */
export const DEFAULT_PLATFORM_NAME = "Emvesso CRM";

/**
 * Splits the product name so the last word can carry the accent colour, the way
 * "Emvesso **CRM**" is rendered.
 *
 * Returns an empty `lead` for a single-word name, so a name like "Acme" renders
 * as one accented word rather than losing its only word to the prefix.
 */
export const splitPlatformName = (name: string | null | undefined) => {
  const words = (name?.trim() || DEFAULT_PLATFORM_NAME).split(/\s+/);
  const accent = words[words.length - 1];

  return { lead: words.slice(0, -1).join(" "), accent };
};
