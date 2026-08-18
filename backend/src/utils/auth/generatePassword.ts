import crypto from "crypto";
import { passwordRegex } from "../../contracts/constants";

/**
 * Character classes.
 *
 * Easily-confused characters (0/O, 1/l/I) are excluded: a temporary password is
 * read off a screen and communicated out of band, so transcription errors are a
 * real cost. The symbol set matches the policy's [^A-Za-z\d\s] requirement.
 */
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*?-_=+";
const ALL = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

const DEFAULT_LENGTH = 16;

/** crypto.randomInt, not Math.random — this value guards an account. */
const pick = (alphabet: string) =>
  alphabet[crypto.randomInt(0, alphabet.length)];

const shuffle = (chars: string[]) => {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
};

/**
 * Generate a temporary password that satisfies passwordRegex by construction:
 * one character is seeded from each required class, the rest are random, and
 * the result is shuffled so the class positions are not predictable.
 *
 * The returned value is never persisted in plaintext and must never be logged.
 */
export const generateTemporaryPassword = (
  length: number = DEFAULT_LENGTH,
): string => {
  const size = Math.max(length, 12);

  const chars = [
    pick(LOWERCASE),
    pick(UPPERCASE),
    pick(DIGITS),
    pick(SYMBOLS),
  ];

  while (chars.length < size) {
    chars.push(pick(ALL));
  }

  const password = shuffle(chars).join("");

  // The construction above cannot fail the policy, but assert rather than
  // assume — a future edit to the alphabets could silently break it.
  if (!passwordRegex.test(password)) {
    throw new Error(
      "Generated temporary password failed the password policy check",
    );
  }

  return password;
};
